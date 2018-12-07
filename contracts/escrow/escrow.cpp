
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

  accounts acc(_self, user.value);

  auto a = acc.find(sym.code().raw());

  eosio_assert(
      a->remaining.amount == 0,
      "Cannot remove a user account who still has a remaining balance");

  acc.erase(a);

  // now remove the account name from the tracker
  holders hldrs(_self, sym.code().raw());
  auto huser = hldrs.find(user.value);
  hldrs.erase(huser);
}

/**
 * Completely remove all accounts from the contract state
 */
void escrow::wipeall(string symbol_str) {
  require_auth(_self);

  symbol sym(symbol_str, 0);

  // now remove the account name from the tracker
  holders hldrs(_self, sym.code().raw());
  for (auto itr = hldrs.begin(); itr != hldrs.end();) {
    accounts acc(_self, itr->account.value);
    acc.erase(acc.find(sym.code().raw()));
    itr = hldrs.erase(itr);
  }
}
/**
 * Adds an escrow account entry
 */
void escrow::addaccount(name user, asset total) {
  require_auth(_self);

  accounts acc(_self, user.value);

  acc.emplace(_self, [&](auto &a) {
    a.remaining = total;
    a.total_escrowed = total;
  });

  // now track the account name in another table for future use
  holders hldrs(_self, total.symbol.code().raw());
  hldrs.emplace(_self, [&](auto &h) { h.account = user; });
}

/**
 * Vests any available tokens for all accounts
 */
void escrow::vest(string symbol_str) {
  require_auth(_self);

  symbol sym(symbol_str, 0);

  auto period = get_current_period(sym);

  print("Found cumulative fraction of ", period.numerator, "/",
        period.denominator);

  eosio_assert(period.fraction() > 0, "Nothing is currently vestable.");

  eosio_assert(period.fraction() <= 1.0,
               "Vesting fraction must be less than 1.");

  holders hldrs(_self, sym.code().raw());
  for (auto itr = hldrs.begin(); itr != hldrs.end(); itr++) {
    auto user = itr->account;
    accounts acc(_self, user.value);
    auto account = acc.find(sym.code().raw());
    asset quantity = asset(0, sym);
    if (account != acc.end()) {
      quantity =
          (account->total_escrowed * period.numerator / period.denominator) -
          (account->total_escrowed - account->remaining);
      acc.modify(account, _self,
                 [&](auto &a) { a.remaining = a.remaining - quantity; });
    }
    if (quantity.amount > 0) {
      // TODO issue a token transfer to the user
      // sythentix transfer [from: _self, to: user.value, quantity, memo: ""]
    }
  }
}

} // namespace eosio
EOSIO_DISPATCH(eosio::escrow,
               (addperiod)(delperiods)(addaccount)(vest)(wipeall));

/*
extern "C" { \
   void apply( uint64_t receiver, uint64_t code, uint64_t action ) { \
      auto self = receiver; \
      if( action == N(onerror)) { \
         // onerror is only valid if it is for the "eosio" code account and
authorized by "eosio"'s "active permission
         eosio_assert(code == N(eosio), "onerror action's are only valid from
the \"eosio\" system account"); \
      } \
      if( ((code == self && action != N(transfer)) || (code == N(eosio.token) &&
action == N(transfer)) || action == N(onerror)) ) { \
         TYPE thiscontract( self ); \
         switch( action ) { \
            EOSIO_API( TYPE, MEMBERS ) \
         } \
         // does not allow destructor of thiscontract to run: eosio_exit(0);
      } \
   } \
}
*/
