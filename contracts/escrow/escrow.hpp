
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

class [[eosio::contract("escrow")]] escrow : public contract {
public:
  using contract::contract;

  [[eosio::action]] void addperiod(string symbolStr, time_point from_time,
                                   uint64_t fraction_can_transfer);
  [[eosio::action]] void delperiods(string symbolStr);
  [[eosio::action]] void addaccount(name user, asset total);

protected:
  uint64_t what_fraction_can_user_transfer(symbol sym, name user) {
    const auto current_time = current_time_point();

    periods plist(_self, sym.code().raw());
    escrow_periods last_entry;

    // iterate through all escrow periods
    for (auto itr = plist.begin(); itr != plist.end();) {
      if (itr->from_time > current_time &&
          itr->from_time > last_entry.from_time) {
        last_entry = *itr;
      }
    }
    return last_entry.fraction;
  }

private:
  /**
   * A table of escrow periods.
   * These stipulate what fraction a user can transfer
   */
  struct [[eosio::table]] escrow_periods {
    time_point from_time = time_point(microseconds(0));
    uint64_t fraction = 0;

    uint64_t primary_key() const { return from_time.elapsed.count(); }
  };
  typedef multi_index<name("periods"), escrow_periods> periods;

  /**
   * A table of account balances. By creating a table "accounts" with a primary
   * key of symbol, users can use `cleos get currency balance token.escrow
   * <name>`.
   */
  struct [[eosio::table]] account {
    asset remaining;
    asset total_escrowed;

    uint64_t primary_key() const { return remaining.symbol.code().raw(); }
  };
  typedef multi_index<name("accounts"), account> accounts;
};

} // namespace eosio
