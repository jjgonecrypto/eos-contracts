
#include <eosiolib/asset.hpp>
#include <eosiolib/eosio.hpp>
#include <eosiolib/system.h>
#include <eosiolib/time.hpp>

using std::string;

namespace eosio {

// taken from multisig contract
time_point current_time_point() {
  const static time_point ct{
      microseconds{static_cast<int64_t>(current_time())}};
  return ct;
}

class [[eosio::contract("token.escrow")]] escrow : public contract {
public:
  using contract::contract;

  [[eosio::action]] void addwlistuser(string symbolStr, name user_to_whitelist);
  [[eosio::action]] void removewlist(string symbolStr);
  [[eosio::action]] void addperiod(string symbolStr, time_point from_time,
                                   uint64_t fraction_can_transfer);

  // Any functionality that you want other contracts to use must be in the
  // header file. Also, nothing in these functions can mutate the tables, that
  // is a restriction of this approach. Instead you'd have to issue an action
  // to this contract.

  uint64_t what_fraction_can_user_transfer(symbol sym, name user) {
    if (is_user_in_whitelist(sym, user))
      return 1;

    const auto current_time = current_time_point();

    periods plist(_self, sym.code().raw());
    escrow_periods last_entry;
    last_entry.from_time = time_point(microseconds(0));
    last_entry.fraction = 0;

    // iterate through all escrow periods
    for (auto itr = plist.begin(); itr != plist.end();) {
      if (itr->from_time > current_time &&
          itr->from_time > last_entry.from_time) {
        last_entry = *itr;
      }
    }
    return last_entry.fraction;
  }

  bool is_user_in_whitelist(symbol sym, name user) {
    whitelist wlist(_self, sym.code().raw());

    auto it = wlist.find(user.value);

    return it != wlist.end();
  }

private:
  struct [[eosio::table]] whitelisted_users {
    name user;

    uint64_t primary_key() const { return user.value; }
  };
  /**
   * A table of escrow periods.
   * These stipulate what fraction a user can transfer
   */
  struct [[eosio::table]] escrow_periods {
    time_point from_time;
    uint64_t fraction;

    uint64_t primary_key() const { return from_time.elapsed.count(); }
  };
  typedef multi_index<name("whitelist"), whitelisted_users> whitelist;
  typedef multi_index<name("periods"), escrow_periods> periods;
}; // namespace eosio

} // namespace eosio
