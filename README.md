# EOS Contracts

A collection of EOS smart contracts that interact with each other. This is meant purely as a proof of concept for contract interaction on EOS.

## Steps

1. have `cleos` pointing to a valid `nodeos` and `keosd` instance
1. compile both `token` and `token.escrow` contracts
1. create accounts for and set both contracts from the compiled WASM and ABIs
1. add a user to the whitelist `cleos push action token.escrow add '["SYS", "someuser1"]' -p token.escrow`
1. try transfer from that user `cleos push action token transfer '["someuser1", "otheruser", "100 SYS"]' -p token`. This should work.
1. now try transfer from another user, not whitelisted, and it should fail `cleos push action token transfer '["otheruser", "someuser", "100 SYS"]' -p token`
