import { Contract } from 'ethers'
import { readFileSync } from 'fs'
import { artifacts } from 'hardhat'

export async function loadContract(
    contractName: string,
    contractAddr: string,
): Promise<Contract> {
    const artifact = await artifacts.readArtifact(contractName)
    return new Contract(contractAddr, artifact.abi)
}

async function main() {
    const rawEvents = JSON.parse(
        readFileSync('./scripts/rawEvents.json', 'utf-8'),
    )

    const configurationChanges = rawEvents.eventLogs
        .filter(
            (v) =>
                !v.removed &&
                v.topics[0] ===
                    '0x1c593a2b803c3f9038e8b6743ba79fbc4276d2770979a01d2768ed12bea3243f',
        )
        .reverse()

    const contract = await loadContract("LibStakingChangeLog", "0x83ED6E57fc4e070d752d10c2b24f101F34eBe08E");
    for (const c of configurationChanges) {
        const event = contract.interface.parseLog(
            {
                topics: ["0x1c593a2b803c3f9038e8b6743ba79fbc4276d2770979a01d2768ed12bea3243f"],
                data: c.data
            }
        );
        console.log({
            txn: c.transactionHash,
            op: event.args.op,
            validator: event.args.validator,
            payload: event.args.payload,
            configurationNumber: Number(event.args.configurationNumber),

        })
    }

    // const subnet = await loadContract("SubnetActorManagerFacet", "0x83ED6E57fc4e070d752d10c2b24f101F34eBe08E");
    // const data = subnet.interface.decodeFunctionData(
    //     "setFederatedPower",
    //     "0xda5d09ee0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000009a0000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000007e6bcac9b600394ea1c7c38ea72cc56f57374c87000000000000000000000000bf20b7664fefb791a1dbb9a9308e1573063113c60000000000000000000000000a35741418da8238c8ba4c50c83a660164f75daf000000000000000000000000e8e8ed5fd65a10200971c3e1e731c1aa49e994b5000000000000000000000000b07e170eff06ce9b96d1d1710ce404382aebea880000000000000000000000008c271ba18b42fa6c414f4c668d6d893551d4cd850000000000000000000000006d8ffd463fcd5fa48ea114defc015831995e420700000000000000000000000094c72dbb3fa675eb4be1b3ccdfc6cf851092cbbc0000000000000000000000006ce52ffa12a9550a55675f6a9c6cf55b5eb944f6000000000000000000000000dc83188b36744a884af3919493762dddc77b373e00000000000000000000000004dd467171b754b6c7f7c38acbdc1fcf20a3c33000000000000000000000000075f46a07294a497914b3c3a851d18fd5354288c0000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000038000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000480000000000000000000000000000000000000000000000000000000000000050000000000000000000000000000000000000000000000000000000000000005800000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000068000000000000000000000000000000000000000000000000000000000000007000000000000000000000000000000000000000000000000000000000000000041045197627a4a7f89458469255afb8711ab4c7bc4a76281376cb361c29bd0d9626758d47feadf43d77f843725cbad419e655d8689369c1ce59ccdaa67d47bd0ddf7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041046ed27e5db71c4e7ec3b4498ee06913a59183e5c87f169652c92e7cc042f629088ef949c488135055722b8237009e7a77f4337185cbc89a6be60c0a63cfc72a2e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000410475f2cbafbf3425ec8bccd96471ca65f8287f7cf51632a02de07e755e602a3f8fde1764936bd39dc72bf6cb52ba4cb793d42e5ec39465593f12e7a9d79c89d9ce0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000410454d737a8759eafadcf00a45708a8d602942ff86d22f0e312a40d32dfab30b665e324a045ef3871d0fa448764317f783a3185bc5541c0c141fdea96f971dda0fb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004104683bac106c55e182fd47ddea0b200fc26a73b9c757c7a95ca166bb55ce468dbfda0933e569ce712138e36eed18b60cc7e1bd327296eeda9ddbe522798ede2290000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041040c42d1f0f193a07c2bed6650417fe10fe6a50eed429bdd54bbe993b5f5f48ddf8a7b922551d552b06547d049b8c2eef5a05b16ffa9414d12f2e9dac582756e010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000410469ffff7be09bb0ea4b14d32f7d87621119ee8093937e1ea4937797dd16cece9b963363df3a2845b6928dab2c3744129ea4afe454654b2cd0a0301f5665fecdd7000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041047d190364263990e8b5bc45032baac70d7ed7fc44cac3a003fd74a87ede4ee080730655961af70bfe40575eb0ce67eaa346b246ba2968319d6e9ae27e41ef06a300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004104f2c72208decfad0f769d8de7dcfc5292d260c63c4d7324b792d55a79ca97cf5b945482033863c49c7c1b33db3411e54443e449f3db91e8c1264d820a56dcffc90000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000410432eb1d0014286f77449cf789e2768eaa2502ff102d5efa9177cc59a4a1df00bc978cac7335ed88e42cbc1c1e4e018d2ca3862c683903cfa66b9684a44b2a51d200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004104d04c1f2e01c8928cb7e55e0847b5be79cf8360f4a6a01144e9ea4e570e9116a621b96e0c500ec7cb53768195cad13b161b8f5c327f9c7f78394af4bd081dd4d600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004104a95c74edbd664d5b02f5771be83320ba623c08684c2919e6b0d14b8770236784616c3f9917c7cb0d1c1df8082439cab5abc7e97b8413b230cb0b99f424c3cb9300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001"
    // );
    // console.log(data);

    // console.log(configurationChanges.map((v) => v.data))
}

main().then(() => console.log('done'))

