# Escrow

This is an example of an escrow holder with vesting schedule. Any given tokens can be transferred in,
and the contract will hold them until vesting is invoked, distributing the percentage back that is owed to the user.

## Steps

1. compile contract `eosio-cpp -o escrow.wasm --abigen escrow.cpp`

1. create account for `escrow`

1. deploy contract under `escrow` account

1. Add a user entry `cleos push action escrow addaccount '["user1", "200 JAYS"]' -p escrow`...

1. Now you can see the user balance via `cleos get currency balance escrow user1` (or ). So the user has `200 JAYS` (though techincally not as `JAYS` are a made up symbol, but we can leverage the fact that `cleos get currency balance` will look for a table `account` scoped to the user's `name`, with a primary key of the given `symbol`).

1) Add a period (3/4 of vesting by Jan 1 of 2019) `cleos push action escrow addperiod '["JAYS", 1546300800000, 3, 4]' -p escrow`
   ( 2018 is `1514764800000`)