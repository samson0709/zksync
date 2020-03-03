const { expect } = require("chai")
const { deployContract } = require("ethereum-waffle");
const { wallet1, wallet2, deployTestContract, getCallRevertReason, SKIP_TEST } = require("./common")

const { performance } = require('perf_hooks');


describe("UpgradeMode unit tests", function () {
    this.timeout(50000);

    let testContract
    before(async () => {
        testContract = await deployContract(wallet1, require('../../build/UpgradeModeTest'), [], {
            gasLimit: 6000000,
        })
    });

    it("checking that requireMaster calls present", async () => {
        let testContract_with_wallet2_signer = await testContract.connect(wallet2);
        expect((await getCallRevertReason( () => testContract_with_wallet2_signer.activate() )).revertReason).equal("oro11")
        expect((await getCallRevertReason( () => testContract_with_wallet2_signer.cancel() )).revertReason).equal("oro11")
        expect((await getCallRevertReason( () => testContract_with_wallet2_signer.isFinalizeStatusActive() )).revertReason).equal("VM did not revert")
        expect((await getCallRevertReason( () => testContract_with_wallet2_signer.forceCancel() )).revertReason).equal("oro11")
        expect((await getCallRevertReason( () => testContract_with_wallet2_signer.finish() )).revertReason).equal("oro11")
    });

    it("test activate, test cancel, test finish without finalize status active", async () => {
        // activate
        await expect(testContract.activate())
            .to.emit(testContract, 'UpgradeModeActivated')
            .withArgs(1);

        expect(await testContract.waitUpgradeModeActive()).to.equal(true)
        await testContract.isFinalizeStatusActive();
        expect(await testContract.finalizeStatusActive()).to.equal(false)

        expect((await getCallRevertReason( () => testContract.activate() )).revertReason).equal("uma11")

        // cancel
        await expect(testContract.cancel())
            .to.emit(testContract, 'UpgradeCanceled')
            .withArgs(1);

        expect(await testContract.waitUpgradeModeActive()).to.equal(false)

        expect((await getCallRevertReason( () => testContract.cancel() )).revertReason).equal("umc11")

        // finish
        expect((await getCallRevertReason( () => testContract.finish() )).revertReason).equal("umf11")
    });

    if (SKIP_TEST) {
        it.skip("checking that the upgrade is done correctly", async () => {});
    }
    else {
        it("checking that the upgrade is done correctly", async () => {
            let start_time = performance.now();

            // activate
            await expect(testContract.activate())
                .to.emit(testContract, 'UpgradeModeActivated')
                .withArgs(1);

            let activated_time = performance.now();

            // wait and activate finalize status
            let all_time_in_sec = parseInt(await testContract.get_WAIT_UPGRADE_MODE_PERIOD());
            for (let step = 1; step <= 3; step++) {
                if (step != 3) {
                    while ((performance.now() - start_time) < Math.round(all_time_in_sec * 1000.0 * step / 10.0 + 10)) {
                        // wait
                    }
                } else {
                    while ((performance.now() - activated_time) < all_time_in_sec * 1000 + 10) {
                        // wait
                    }
                }

                if (step != 3) {
                    await testContract.isFinalizeStatusActive();
                    expect(await testContract.finalizeStatusActive()).to.equal(false)
                } else {
                    await expect(testContract.isFinalizeStatusActive())
                        .to.emit(testContract, 'UpgradeModeFinalizeStatusActivated')
                        .withArgs(1);
                    expect(await testContract.finalizeStatusActive()).to.equal(true)
                }
            }

            // finish
            await expect(testContract.finish())
                .to.emit(testContract, 'UpgradeCompleted')
                .withArgs(1);


            // one more activate and cancel with version equal to 2
            await expect(testContract.activate())
                .to.emit(testContract, 'UpgradeModeActivated')
                .withArgs(2);
            await expect(testContract.cancel())
                .to.emit(testContract, 'UpgradeCanceled')
                .withArgs(2);
        });
    }

    if (SKIP_TEST) {
        it.skip("checking that force cancellation works correctly", async () => {});
    }
    else {
        it("checking that force cancellation works correctly", async () => {
            let start_time = performance.now();

            // activate
            await expect(testContract.activate())
                .to.emit(testContract, 'UpgradeModeActivated')
                .withArgs(2);

            let activated_time = performance.now();

            // wait and force cancel
            let all_time_in_sec = parseInt(await testContract.get_MAX_UPGRADE_PERIOD());
            for (let step = 1; step <= 5; step++) {
                if (step != 5) {
                    while ((performance.now() - start_time) < Math.round(all_time_in_sec * 1000.0 * step / 10.0 + 10)) {
                        // wait
                    }
                } else {
                    while ((performance.now() - activated_time) < all_time_in_sec * 1000 + 10) {
                        // wait
                    }
                }

                if (step != 5) {
                    expect((await getCallRevertReason( () => testContract.forceCancel() )).revertReason).equal("ufc12")
                } else {
                    await expect(testContract.forceCancel())
                        .to.emit(testContract, 'UpgradeForciblyCanceled')
                        .withArgs(2);
                    expect(await testContract.waitUpgradeModeActive()).to.equal(false)
                }
            }

            expect((await getCallRevertReason( () => testContract.forceCancel() )).revertReason).equal("ufc11")
        });
    }

});
