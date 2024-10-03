// Copyright 2022-2024 Protocol Labs
// SPDX-License-Identifier: Apache-2.0, MIT

mod cache;
mod error;

pub mod convert;
pub mod proxy;

pub mod launch;
pub mod observation;
pub mod observe;
pub mod syncer;
pub mod vote;

use ethers::utils::hex;
use fendermint_crypto::quorum::ECDSACertificate;
use ipc_api::cross::IpcEnvelope;
use ipc_api::staking::StakingChangeRequest;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

pub use crate::cache::{SequentialAppendError, SequentialKeyCache, ValueIter};
pub use crate::error::Error;
use crate::observation::{LinearizedParentBlockView, Observation};
use crate::syncer::{ParentSyncerConfig, ParentSyncerReactorClient};
use crate::vote::payload::PowerUpdates;
use crate::vote::{VoteConfig, VoteReactorClient};

pub type BlockHeight = u64;
pub type Bytes = Vec<u8>;
pub type BlockHash = Bytes;

/// The null round error message
pub(crate) const NULL_ROUND_ERR_MSG: &str = "requested epoch was a null round";

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub syncer: ParentSyncerConfig,
    pub voting: VoteConfig,
}

/// On-chain data structure representing a topdown checkpoint agreed to by a
/// majority of subnet validators. DAG-CBOR encoded, embedded in CertifiedCheckpoint.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Checkpoint {
    V1(Observation),
}

/// Topdown proposal as part of fendermint proposal execution
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TopdownProposal {
    pub cert: ECDSACertificate<Observation>,
    pub effects: (Vec<IpcEnvelope>, Vec<StakingChangeRequest>),
}

#[derive(Clone)]
pub struct TopdownClient {
    syncer: ParentSyncerReactorClient,
    voting: VoteReactorClient,
}

impl TopdownClient {
    pub async fn validate_quorum_proposal(&self, proposal: TopdownProposal) -> anyhow::Result<()> {
        self.voting.check_quorum_cert(Box::new(proposal.cert)).await
    }

    pub async fn find_topdown_proposal(&self) -> anyhow::Result<Option<TopdownProposal>> {
        let Some(quorum_cert) = self.voting.find_quorum().await? else {
            return Ok(None);
        };

        let Ok(views) = self
            .syncer
            .query_parent_block_view(quorum_cert.payload().parent_height)
            .await?
        else {
            // absorb the error, dont alert the caller
            return Ok(None);
        };

        let mut linear = LinearizedParentBlockView::from(quorum_cert.payload());

        let mut xnet_msgs = vec![];
        let mut validator_changes = vec![];

        for maybe_view in views {
            let Some(v) = maybe_view else {
                tracing::error!(
                    till = quorum_cert.payload().parent_height,
                    "parent block view does not have all the data"
                );
                return Ok(None);
            };

            if let Err(e) = linear.append(v.clone()) {
                tracing::error!(err = e.to_string(), "parent block view cannot be appended");
                return Ok(None);
            }

            if let Some(payload) = v.payload {
                xnet_msgs.extend(payload.xnet_msgs);
                validator_changes.extend(payload.validator_changes);
            }
        }

        let ob = match linear.into_observation() {
            Ok(ob) => ob,
            Err(e) => {
                tracing::error!(
                    err = e.to_string(),
                    "cannot convert linearized parent view into observation"
                );
                return Ok(None);
            }
        };

        if ob != *quorum_cert.payload() {
            // could be due to the minor quorum, just return no proposal
            tracing::warn!(
                created = ob.to_string(),
                expected = quorum_cert.payload().to_string(),
                "block view observation created not match quorum cert"
            );
            return Ok(None);
        }

        Ok(Some(TopdownProposal {
            cert: quorum_cert,
            effects: (xnet_msgs, validator_changes),
        }))
    }

    pub async fn parent_finalized(&self, checkpoint: Checkpoint) -> anyhow::Result<()> {
        self.voting
            .set_quorum_finalized(checkpoint.target_height())
            .await??;
        self.syncer.finalize_parent_height(checkpoint).await?;
        Ok(())
    }

    pub async fn update_power_table(&self, updates: PowerUpdates) -> anyhow::Result<()> {
        self.voting.update_power_table(updates).await
    }
}

pub(crate) fn is_null_round_str(s: &str) -> bool {
    s.contains(NULL_ROUND_ERR_MSG)
}

impl From<&Observation> for Checkpoint {
    fn from(value: &Observation) -> Self {
        Self::V1(value.clone())
    }
}

impl Display for Checkpoint {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Checkpoint::V1(v) => {
                write!(
                    f,
                    "Checkpoint(version = 1, height = {}, block_hash = {}, effects = {})",
                    v.parent_height,
                    hex::encode(&v.parent_hash),
                    hex::encode(&v.cumulative_effects_comm)
                )
            }
        }
    }
}

impl Checkpoint {
    pub fn v1(height: BlockHeight, hash: BlockHash, effects: Bytes) -> Self {
        Self::V1(Observation::new(height, hash, effects))
    }

    pub fn target_height(&self) -> BlockHeight {
        match self {
            Checkpoint::V1(b) => b.parent_height,
        }
    }

    pub fn target_hash(&self) -> &Bytes {
        match self {
            Checkpoint::V1(b) => &b.parent_hash,
        }
    }

    pub fn cumulative_effects_comm(&self) -> &Bytes {
        match self {
            Checkpoint::V1(b) => &b.cumulative_effects_comm,
        }
    }
}
