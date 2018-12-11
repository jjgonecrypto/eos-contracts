
#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#include "escrow.hpp"

using std::string;
using std::to_string;

namespace eosio {

/**
 * Adds an escrow period.
 */
void escrow::addperiod(string symbol_str, uint64_t timestamp,
                       uint64_t numerator, uint64_t denominator) {
  require_auth(_self);

  symbol sym(symbol_str, 0);

  // Prevent periods being added after accounts already added into the contract
  holders hldrs(_self, sym.code().raw());
  eosio_assert(hldrs.begin() == hldrs.end(),
               "Cannot add an escrow period after accounts have been added.");

  periods prds(_self, sym.code().raw());

  // ensure denominator is consistent (so we can do integer arthimetic with the
  // assets later)
  auto first_period = prds.begin();
  if (first_period != prds.end()) {
    const string msg = "Cannot add a new escrow as supplied denominator does "
                       "not match denominator \"" +
                       to_string(first_period->denominator) +
                       "\" from existing period(s)";
    eosio_assert(denominator == first_period->denominator, msg.c_str());
  } else {
    print("Setting denominator as " + to_string(denominator) +
          ". All successive periods must use this.");
  }

  prds.emplace(_self, [&](auto &p) {
    p.from_time = time_point(microseconds(timestamp * 1000));
    p.numerator = numerator;
    p.denominator = denominator;
  });
}

/**
 * Removes all escrow period entries for the given symbol.
 */
void escrow::delperiods(string symbol_str) {
  require_auth(_self);

  symbol sym(symbol_str, 0);

  periods prds(_self, sym.code().raw());

  for (auto itr = prds.begin(); itr != prds.end();) {
    itr = prds.erase(itr);
  }
}

/**
 * Removes an account entry
 */
void escrow::delaccount(name user, string symbol_str) {
  require_auth(_self);

  symbol sym(symbol_str, 0);

  eosio_assert(sym.is_valid(), "Supplied symbol must be valid");

  accounts acc(_self, user.value);

  auto a = acc.find(sym.code().raw());

  eosio_assert(
      a->remaining.amount == 0,
      "Cannot remove a user who still has a remaining balance for this symbol");

  acc.erase(a);

  // now remove the account name from the tracker
  holders hldrs(_self, sym.code().raw());
  auto huser = hldrs.find(user.value);
  hldrs.erase(huser);
}

/**
 * Receive incoming tokens on behalf of a user
 */
void escrow::transfer(name from, name to, asset quantity, string memo) {
  eosio_assert(from == token_contract,
               "Transfers only allowed from associated token contract");
  eosio_assert(to == _self, "Transfers only allowed to this contract");
  eosio_assert(quantity.symbol.is_valid(), "Supplied symbol must be valid");
  eosio_assert(quantity.amount > 0,
               "Amount to transfer must be greater than 0");
  name recipient = name(memo);
  eosio_assert(is_account(recipient), "Recipient must be a valid account");

  require_recipient(recipient);

  accounts acc(_self, recipient.value);

  auto account = acc.find(quantity.symbol.code().raw());

  if (account == acc.begin()) {
    acc.emplace(_self, [&](auto &a) {
      a.remaining = quantity;
      a.total_escrowed = quantity;
    });
  } else {
    // TODO - add to entry if it already exists (and confirm symbol matches)
  }

  // now track the account name in another table for future use
  holders hldrs(_self, quantity.symbol.code().raw());
  hldrs.emplace(_self, [&](auto &h) { h.account = recipient; });
}

/**
 * Vests any available tokens for the account
 */
void escrow::vest(string symbol_str, name user) {
  require_auth(_self);

  symbol sym(symbol_str, 0);

  eosio_assert(sym.is_valid(), "Supplied symbol must be valid");

  auto period = get_current_period(sym);

  // print("Found cumulative fraction of ", period.numerator, "/",
  // period.denominator);

  eosio_assert(period.fraction() > 0, "Nothing is currently vestable.");

  eosio_assert(period.fraction() <= 1.0,
               "Vesting fraction must be less than 1.");

  accounts acc(_self, user.value);
  auto account = acc.find(sym.code().raw());
  asset quantity = asset(0, sym);
  if (account != acc.end()) {
    quantity =
        (account->total_escrowed * period.numerator / period.denominator) -
        (account->total_escrowed - account->remaining);
  }
  if (quantity.amount > 0) {
    // issue a token transfer to the user
    // TODO add eosio.code perms feature
    // action(permission_level{_self, name("active")}, token_contract,
    //        name("transfer"), std::make_tuple(_self, user, quantity,
    //        "Vested"))
    //     .send();

    // Now deduct from their account
    acc.modify(account, _self,
               [&](auto &a) { a.remaining = a.remaining - quantity; });
  }
}

extern "C" {
void apply(uint64_t receiver, uint64_t code, uint64_t action) {
  if (code == receiver) {
    switch (action) {
      EOSIO_DISPATCH_HELPER(eosio::escrow,
                            (addperiod)(delperiods)(delaccount)(vest))
    }
  } else if (code == (eosio::escrow::token_contract).value &&
             action == name("transfer").value) {
    execute_action(name(receiver), name(code), &escrow::transfer);
  } else if (action == name("onerror").value) {
    eosio_assert(
        code == name("eosio").value,
        "onerror action's are only valid from the \"eosio\" system account");
  }
}
}
} // namespace eosio
