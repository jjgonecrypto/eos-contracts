
#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>

#include "escrow.hpp"

using std::string;

namespace eosio {

/**
 * Removes all escrow period entries.
 */
void escrow::delperiods(string symbolStr) {
  require_auth(_self);

  symbol sym(symbolStr, 0);

  periods prds(_self, sym.code().raw());

  for (auto itr = prds.begin(); itr != prds.end();) {
    itr = prds.erase(itr);
  }
}

/**
 * Adds an escrow period.
 */
void escrow::addperiod(string symbolStr, time_point from_time,
                       uint64_t fraction_can_transfer) {
  require_auth(_self);

  symbol sym(symbolStr, 0);

  periods prds(_self, sym.code().raw());

  prds.emplace(_self, [&](auto &p) {
    p.from_time = from_time;
    p.fraction = fraction_can_transfer;
  });
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
}

} // namespace eosio
EOSIO_DISPATCH(eosio::escrow, (addperiod)(delperiods)(addaccount));
