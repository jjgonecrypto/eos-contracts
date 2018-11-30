# Compiled-Read

This is an example of a contract where it can read the table state of a another already-deployed contract by being compiled with the same source file.

## Steps

1. compile both contracts in their respective folders:

   - `eosio-cpp -o whitelist.wasm --abigen whitelist.cpp`
   - `eosio-cpp -o wlist.token.wasm --abigen wlist.token.cpp`

1. create accounts for both `whitelist` and `wlist.token`

1. deploy both contracts under those accounts

1. try transfer from a user, not whitelisted, and it should fail at the whitelist assertion `cleos push action wlist.token transfer '["user1", "otheruser", "100 SYS"]' -p wlist.token` (Note: the permission `-p` can be any account for this demo, it doesn't require `wlist.token`)

1. add a user to the whitelist `cleos push action whitelist add '["SYS", "user1"]' -p whitelist`

1. try transfer from that user `cleos push action wlist.token transfer '["user1", "otheruser", "100 SYS"]' -p wlist.token`. This should pass the whitelist.
