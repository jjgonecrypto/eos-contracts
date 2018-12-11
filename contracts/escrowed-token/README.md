# Escrow

This is an example of an escrow holder with vesting schedule. Any given tokens can be transferred in,
and the contract will hold them until vesting is invoked, distributing the percentage back that is owed to the user.

## Steps

1. compile contract `npm run compile` or `npm run compile:docker`

1. create account for `eosio.token`

1. deploy contracdt for `eosio.token`

1. create account for `escrow`

1. deploy contract under `escrow` account

1. Create user `user1`

1. Create `eosio.token` and issue some to `escrow` with `user1` as the `memo`

1. Now you can see the user balance via `cleos get currency balance escrow user1` (leveraging the fact that `cleos get currency balance` will look for a table `account` scoped to the user's `name`, with a primary key of the given `symbol`).

1. Add a period (3/4 of vesting by Jan 1 of 2019) `cleos push action escrow addperiod '["JAYS", 1546300800000, 3, 4]' -p escrow`
   ( 2018 is `1514764800000`)

1. Invoke `vest`
