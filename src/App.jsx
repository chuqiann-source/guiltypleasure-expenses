import { useEffect, useMemo, useState } from "react";
import "./App.css";
import DuckLevel1 from "./DuckLevel1";

import {
  CakeIcon,
  TruckIcon,
  HomeIcon,
  ShoppingBagIcon,
  BriefcaseIcon,
  PaperAirplaneIcon,
  FilmIcon,
  UserGroupIcon,
  EllipsisHorizontalCircleIcon,
  XMarkIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

const categories = [
  { name: "Food", icon: CakeIcon },
  { name: "Fuel", icon: TruckIcon },
  { name: "Bills", icon: HomeIcon },
  { name: "Shopping", icon: ShoppingBagIcon },
  { name: "Business", icon: BriefcaseIcon },
  { name: "Travel", icon: PaperAirplaneIcon },
  { name: "Entertainment", icon: FilmIcon },
  { name: "Friends", icon: UserGroupIcon },
  { name: "Others", icon: EllipsisHorizontalCircleIcon },
];

const currencies = ["RM", "SGD"];

function formatMoney(amount, currency = "RM") {
  return `${currency} ${Number(amount || 0).toFixed(2)}`;
}

function formatCentsInput(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? (Number(digits) / 100).toFixed(2) : "";
}

function getDuckStage(level) {
  if (level >= 30) return "Duck King";
  if (level >= 20) return "Merchant Duck";
  if (level >= 10) return "Miner Duck";
  if (level >= 5) return "Explorer Duck";
  return "Baby Duck";
}

function getDuckAssets(level) {
  if (level >= 30) return { duck: "duck-30.png", room: "room-30.png" };
  if (level >= 20) return { duck: "duck-20.png", room: "room-20.png" };
  if (level >= 10) return { duck: "duck-10.png", room: "room-10.png" };
  if (level >= 5) return { duck: "duck-05.png", room: "room-05.png" };
  return { duck: "duck-01.png", room: "room-01.png" };
}

function App() {
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);
  const currentMonth = today.toISOString().slice(0, 7);

  const readableDate = today.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [mainCurrency, setMainCurrency] = useState(
    () => localStorage.getItem("main_currency") || "RM"
  );

  const [expenses, setExpenses] = useState(
    () => JSON.parse(localStorage.getItem("guilty_expenses")) || []
  );

  const [friends, setFriends] = useState(
    () => JSON.parse(localStorage.getItem("guilty_friends")) || ["Alex", "Ben"]
  );

  const [splitBills, setSplitBills] = useState(
    () => JSON.parse(localStorage.getItem("guilty_split_bills")) || []
  );

  const [duck, setDuck] = useState(
    () =>
      JSON.parse(localStorage.getItem("guilty_duck")) || {
        xp: 0,
        level: 1,
      }
  );

  const [tab, setTab] = useState("home");
  const [historyMode, setHistoryMode] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDuckGuide, setShowDuckGuide] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [newFriend, setNewFriend] = useState("");

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    currency: mainCurrency,
    category: "Food",
    date: todayDate,
    note: "",
  });

  const [splitForm, setSplitForm] = useState({
    title: "",
    amount: "",
    currency: mainCurrency,
    category: "Friends",
    paidBy: "You",
    date: todayDate,
    splitType: "equal",
    selectedFriends: [],
    customRows: [],
  });

  useEffect(() => {
    localStorage.setItem("main_currency", mainCurrency);
  }, [mainCurrency]);

  useEffect(() => {
    localStorage.setItem("guilty_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("guilty_friends", JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    localStorage.setItem("guilty_split_bills", JSON.stringify(splitBills));
  }, [splitBills]);

  useEffect(() => {
    localStorage.setItem("guilty_duck", JSON.stringify(duck));
  }, [duck]);

  const duckLevel = duck.level;
  const duckStage = getDuckStage(duckLevel);
  const duckXpInLevel = duck.xp % 100;
  const duckAssets = getDuckAssets(duckLevel);
  const basePath = `${import.meta.env.BASE_URL}ducks/`;

  function rewardDuck(points) {
    const newXp = duck.xp + points;
    const newLevel = Math.floor(newXp / 100) + 1;
    setDuck({ xp: newXp, level: newLevel });
  }

  function getMyShareFromSplitBill(bill) {
    const amount = Number(bill.amount || 0);

    if (bill.paidBy !== "You") {
      const myDebt = bill.owes.find((item) => item.person === "You");
      return myDebt ? Number(myDebt.amount || 0) : 0;
    }

    const friendsShare = bill.owes.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    return Math.max(amount - friendsShare, 0);
  }

  function getFriendsOweMe(currency) {
    return splitBills
      .filter((bill) => bill.currency === currency && bill.paidBy === "You")
      .reduce((sum, bill) => {
        const outstanding = bill.owes
          .filter((item) => !item.settled)
          .reduce((s, item) => s + Number(item.amount || 0), 0);

        return sum + outstanding;
      }, 0);
  }

  const currentMonthPersonalExpenses = useMemo(() => {
    return expenses.filter(
      (item) =>
        item.date.startsWith(currentMonth) && item.currency === mainCurrency
    );
  }, [expenses, currentMonth, mainCurrency]);

  const currentMonthSplitExpenses = useMemo(() => {
    return splitBills
      .filter(
        (bill) =>
          bill.date.startsWith(currentMonth) && bill.currency === mainCurrency
      )
      .map((bill) => ({
        id: `split-${bill.id}`,
        amount: getMyShareFromSplitBill(bill),
        currency: bill.currency,
        category: bill.category || "Friends",
        date: bill.date,
        note: `Split: ${bill.title}`,
        isSplit: true,
      }))
      .filter((item) => item.amount > 0);
  }, [splitBills, currentMonth, mainCurrency]);

  const currentMonthExpenses = [
    ...currentMonthPersonalExpenses,
    ...currentMonthSplitExpenses,
  ];

  const historyPersonalExpenses = useMemo(() => {
    return expenses.filter(
      (item) =>
        item.date.startsWith(selectedMonth) && item.currency === mainCurrency
    );
  }, [expenses, selectedMonth, mainCurrency]);

  const historySplitExpenses = useMemo(() => {
    return splitBills
      .filter(
        (bill) =>
          bill.date.startsWith(selectedMonth) && bill.currency === mainCurrency
      )
      .map((bill) => ({
        id: `split-${bill.id}`,
        amount: getMyShareFromSplitBill(bill),
        currency: bill.currency,
        category: bill.category || "Friends",
        date: bill.date,
        note: `Split: ${bill.title}`,
        isSplit: true,
      }))
      .filter((item) => item.amount > 0);
  }, [splitBills, selectedMonth, mainCurrency]);

  const historyMonthExpenses = [...historyPersonalExpenses, ...historySplitExpenses];

  const filteredHistoryExpenses =
    selectedCategory === "All"
      ? historyMonthExpenses
      : historyMonthExpenses.filter((item) => item.category === selectedCategory);

  const totalMonth = currentMonthExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const dailyAverage = totalMonth / today.getDate();
  const friendsOweMe = getFriendsOweMe(mainCurrency);

  const categoryTotals = categories
    .map((category) => {
      const total = currentMonthExpenses
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return { ...category, total };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const historyCategoryTotals = categories
    .map((category) => {
      const total = historyMonthExpenses
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return { ...category, total };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const maxCategory = categoryTotals[0]?.total || 1;
  const maxHistoryCategory = historyCategoryTotals[0]?.total || 1;
  const recentExpenses = currentMonthExpenses.slice(0, 5);

  function addExpense(e) {
    e.preventDefault();

    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) return;

    const newExpense = {
      id: Date.now(),
      amount: Number(expenseForm.amount),
      currency: expenseForm.currency,
      category: expenseForm.category,
      date: expenseForm.date,
      note: expenseForm.note.trim(),
    };

    setExpenses([newExpense, ...expenses]);
    rewardDuck(expenseForm.category === "Travel" ? 8 : 5);

    setExpenseForm({
      amount: "",
      currency: mainCurrency,
      category: "Food",
      date: todayDate,
      note: "",
    });

    setShowExpenseModal(false);
  }

  function deleteExpense(id) {
    if (String(id).startsWith("split-")) return;
    setExpenses(expenses.filter((item) => item.id !== id));
  }

  function addFriend(e) {
    e.preventDefault();

    const name = newFriend.trim();
    if (!name || friends.includes(name) || name === "You") return;

    setFriends([...friends, name]);
    setNewFriend("");
  }

  function deleteFriend(name) {
    setFriends(friends.filter((friend) => friend !== name));

    setSplitForm({
      ...splitForm,
      selectedFriends: splitForm.selectedFriends.filter(
        (friend) => friend !== name
      ),
      customRows: splitForm.customRows.filter((row) => row.name !== name),
    });
  }

  function toggleFriend(name) {
    const selected = splitForm.selectedFriends.includes(name);

    const selectedFriends = selected
      ? splitForm.selectedFriends.filter((friend) => friend !== name)
      : [...splitForm.selectedFriends, name];

    const customRows = selected
      ? splitForm.customRows.filter((row) => row.name !== name)
      : [...splitForm.customRows, { name, value: "" }];

    setSplitForm({ ...splitForm, selectedFriends, customRows });
  }

  function updateCustomValue(name, value) {
    const clean =
      splitForm.splitType === "percentage"
        ? String(value || "").replace(/\D/g, "")
        : formatCentsInput(value);

    setSplitForm({
      ...splitForm,
      customRows: splitForm.customRows.map((row) =>
        row.name === name ? { ...row, value: clean } : row
      ),
    });
  }

  function addSplitBill(e) {
    e.preventDefault();

    const amount = Number(splitForm.amount);
    if (!splitForm.title || !amount || !splitForm.paidBy) return;
    if (splitForm.selectedFriends.length === 0) return;

    let owes = [];

    if (splitForm.splitType === "equal") {
      const people = Array.from(
        new Set([splitForm.paidBy, "You", ...splitForm.selectedFriends])
      );

      const perPerson = amount / people.length;

      owes = people
        .filter((person) => person !== splitForm.paidBy)
        .map((person) => ({
          person,
          amount: perPerson,
          settled: false,
        }));
    }

    if (splitForm.splitType === "custom") {
      owes = splitForm.customRows
        .filter((row) => Number(row.value) > 0)
        .map((row) => ({
          person: row.name,
          amount: Number(row.value),
          settled: false,
        }));
    }

    if (splitForm.splitType === "percentage") {
      owes = splitForm.customRows
        .filter((row) => Number(row.value) > 0)
        .map((row) => ({
          person: row.name,
          amount: amount * (Number(row.value) / 100),
          settled: false,
        }));
    }

    const newBill = {
      id: Date.now(),
      title: splitForm.title.trim(),
      amount,
      currency: splitForm.currency,
      category: splitForm.category,
      paidBy: splitForm.paidBy.trim(),
      date: splitForm.date,
      splitType: splitForm.splitType,
      owes,
    };

    setSplitBills([newBill, ...splitBills]);
    rewardDuck(5);

    setSplitForm({
      title: "",
      amount: "",
      currency: mainCurrency,
      category: "Friends",
      paidBy: "You",
      date: todayDate,
      splitType: "equal",
      selectedFriends: [],
      customRows: [],
    });
  }

  function deleteSplitBill(id) {
    setSplitBills(splitBills.filter((bill) => bill.id !== id));
  }

  function toggleSettled(billId, person) {
    setSplitBills(
      splitBills.map((bill) => {
        if (bill.id !== billId) return bill;

        return {
          ...bill,
          owes: bill.owes.map((item) => {
            if (item.person !== person) return item;
            if (!item.settled) rewardDuck(10);
            return { ...item, settled: !item.settled };
          }),
        };
      })
    );
  }

  function calculateSettlements() {
    const balancesByCurrency = {};

    splitBills.forEach((bill) => {
      const currency = bill.currency || "RM";

      if (!balancesByCurrency[currency]) {
        balancesByCurrency[currency] = {};
      }

      bill.owes.forEach((item) => {
        if (item.settled) return;

        const payer = bill.paidBy;
        const debtor = item.person;
        const amount = Number(item.amount || 0);

        balancesByCurrency[currency][payer] =
          (balancesByCurrency[currency][payer] || 0) + amount;

        balancesByCurrency[currency][debtor] =
          (balancesByCurrency[currency][debtor] || 0) - amount;
      });
    });

    const settlements = [];

    Object.entries(balancesByCurrency).forEach(([currency, balances]) => {
      const creditors = [];
      const debtors = [];

      Object.entries(balances).forEach(([person, amount]) => {
        if (amount > 0.01) creditors.push({ person, amount });
        if (amount < -0.01) debtors.push({ person, amount: Math.abs(amount) });
      });

      let i = 0;
      let j = 0;

      while (i < debtors.length && j < creditors.length) {
        const payment = Math.min(debtors[i].amount, creditors[j].amount);

        settlements.push({
          from: debtors[i].person,
          to: creditors[j].person,
          amount: payment,
          currency,
        });

        debtors[i].amount -= payment;
        creditors[j].amount -= payment;

        if (debtors[i].amount <= 0.01) i++;
        if (creditors[j].amount <= 0.01) j++;
      }
    });

    return settlements;
  }

  const settlements = calculateSettlements();

  return (
    <main className="app">
      <header className="top-header">
        <div className="date-pill">
          <CalendarDaysIcon />
          <span>{readableDate}</span>
        </div>
      </header>

      {tab === "home" && (
        <>
          <div className="currency-toggle">
            {currencies.map((currency) => (
              <button
                key={currency}
                className={mainCurrency === currency ? "active" : ""}
                onClick={() => setMainCurrency(currency)}
              >
                {currency}
              </button>
            ))}
          </div>

          <section className="duck-card">
            <div className="duck-face animated-duck">
              {duckLevel < 5 ? (
                <DuckLevel1 />
              ) : (
               <img
                  src={`${basePath}${duckAssets.duck}`}
                  alt={duckStage}
                />
              )}
            </div>

            <div>
              <strong>{duckStage}</strong>

                <p>LV {duckLevel}</p>

                <div className="xp-bar">
                  <div
                  className="xp-fill"
                    style={{
                      width: `${duckXpInLevel}%`,
                    }}
                  />
                </div>

                <small>
                  {duckXpInLevel}/100 XP
                </small>
              
              </div>

            <button onClick={() => setShowDuckGuide(true)}>
              evolve
            </button>
          </section>

          <section className="hero-card">
            <p className="overline">This Month</p>
            <h1>{formatMoney(totalMonth, mainCurrency)}</h1>
            <span>~ {formatMoney(dailyAverage, mainCurrency)} / day</span>
          </section>

          {friendsOweMe > 0 && (
            <section className="section-card owe-card">
              <div className="section-title">
                <h2>Friends Owe You</h2>
              </div>
              <h2>{formatMoney(friendsOweMe, mainCurrency)}</h2>
            </section>
          )}

          <section className="section-card">
            <div className="section-title">
              <h2>Loot by Category</h2>
            </div>

            {categoryTotals.length === 0 ? (
              <p className="empty">No loot spent yet.</p>
            ) : (
              <CategoryList
                items={categoryTotals.slice(0, 3)}
                max={maxCategory}
                currency={mainCurrency}
              />
            )}
          </section>

          <section className="section-card">
            <div className="section-title">
              <h2>Recent Drops</h2>
            </div>

            {recentExpenses.length === 0 ? (
              <p className="empty">A suspiciously peaceful month.</p>
            ) : (
              <TransactionList items={recentExpenses} onDelete={deleteExpense} />
            )}
          </section>
        </>
      )}

      {tab === "split" && (
        <section className="section-card page-card">
          <div className="section-title">
            <h2>Party Split</h2>
          </div>

          <form className="friend-form" onSubmit={addFriend}>
            <input
              placeholder="Add player name"
              value={newFriend}
              onChange={(e) => setNewFriend(e.target.value)}
            />
            <button type="submit">add</button>
          </form>

          <div className="friend-list">
            {friends.map((friend) => (
              <button
                key={friend}
                type="button"
                className={
                  splitForm.selectedFriends.includes(friend)
                    ? "friend-chip active"
                    : "friend-chip"
                }
                onClick={() => toggleFriend(friend)}
              >
                {friend}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFriend(friend);
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>

          <form className="split-form" onSubmit={addSplitBill}>
            <input
              placeholder="Bill title"
              value={splitForm.title}
              onChange={(e) =>
                setSplitForm({ ...splitForm, title: e.target.value })
              }
            />

            <input
              type="text"
              inputMode="numeric"
              enterKeyHint="done"
              placeholder="0.00"
              value={splitForm.amount}
              onChange={(e) =>
                setSplitForm({
                  ...splitForm,
                  amount: formatCentsInput(e.target.value),
                })
              }
            />

            <select
              value={splitForm.currency}
              onChange={(e) =>
                setSplitForm({ ...splitForm, currency: e.target.value })
              }
            >
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>

            <select
              value={splitForm.category}
              onChange={(e) =>
                setSplitForm({ ...splitForm, category: e.target.value })
              }
            >
              {categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={splitForm.paidBy}
              onChange={(e) =>
                setSplitForm({ ...splitForm, paidBy: e.target.value })
              }
            >
              <option value="You">You</option>
              {friends.map((friend) => (
                <option key={friend} value={friend}>
                  {friend}
                </option>
              ))}
            </select>

            <div
              <label className="date-pill-field">
                <CalendarDaysIcon />

              <span>
                {new Date(splitForm.date).toLocaleDateString("en-MY", {
                    day: "numeric",
                  month: "short",
                  year: "numeric",
              })}
            </span>

            <input
              type="date"
              value={splitForm.date}
              onChange={(e) =>
                setSplitForm({
                  ...splitForm,
                  date: e.target.value,
                })
              }
              className="hidden-date-input"
            />
          </label>

            <div className="segmented-split">
              {["equal", "custom", "percentage"].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={splitForm.splitType === type ? "active" : ""}
                  onClick={() => setSplitForm({ ...splitForm, splitType: type })}
                >
                  {type === "percentage" ? "%" : type}
                </button>
              ))}
            </div>

            {(splitForm.splitType === "custom" ||
              splitForm.splitType === "percentage") && (
              <div className="custom-split">
                <p className="hint">
                  {splitForm.splitType === "custom"
                    ? "Enter each player's amount."
                    : "Enter each player's percentage."}
                </p>

                {splitForm.customRows.map((row) => (
                  <div className="custom-row" key={row.name}>
                    <span>{row.name}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder={
                        splitForm.splitType === "custom"
                          ? "0.00"
                          : "%"
                      }
                      value={row.value}
                      onChange={(e) => updateCustomValue(row.name, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            <button className="save-btn" type="submit">
              save split
            </button>
          </form>

          <div className="split-list">
            {splitBills.map((bill) => (
              <div className="split-card" key={bill.id}>
                <div className="split-top">
                  <div>
                    <strong>{bill.title}</strong>
                    <p>
                      {bill.date} · {bill.paidBy} paid{" "}
                      {formatMoney(bill.amount, bill.currency)}
                    </p>
                  </div>

                  <button
                    className="delete-btn"
                    onClick={() => deleteSplitBill(bill.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>

                {bill.owes.map((item) => (
                  <div
                    className={item.settled ? "owe-line settled" : "owe-line"}
                    key={item.person}
                  >
                    <span>
                      {item.person} owes {bill.paidBy}{" "}
                      <b>{formatMoney(item.amount, bill.currency)}</b>
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleSettled(bill.id, item.person)}
                    >
                      <CheckCircleIcon />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "history" && (
        <section className="section-card page-card">
          <div className="section-title">
            <h2>Archive</h2>
          </div>

          <div className="month-input-wrap">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          <div className="segmented-history">
            <button
              className={historyMode === "all" ? "active" : ""}
              onClick={() => setHistoryMode("all")}
            >
              all
            </button>
            <button
              className={historyMode === "category" ? "active" : ""}
              onClick={() => setHistoryMode("category")}
            >
              category
            </button>
          </div>

          {historyMode === "all" && (
            <>
              <div className="select-wrap">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option>All</option>
                  {categories.map((category) => (
                    <option key={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>

              {filteredHistoryExpenses.length === 0 ? (
                <p className="empty">No matching expenses.</p>
              ) : (
                <TransactionList
                  items={filteredHistoryExpenses}
                  onDelete={deleteExpense}
                />
              )}
            </>
          )}

          {historyMode === "category" && (
            <>
              {historyCategoryTotals.length === 0 ? (
                <p className="empty">No category spending.</p>
              ) : (
                <CategoryList
                  items={historyCategoryTotals}
                  max={maxHistoryCategory}
                  currency={mainCurrency}
                />
              )}
            </>
          )}
        </section>
      )}

      {tab === "split" ? (
        <button
          className="record-button"
          onClick={() => setShowSettlement(true)}
        >
          Balance
        </button>
      ) : tab === "home" ? (
        <button
          className="record-button"
          onClick={() => setShowExpenseModal(true)}
        >
          + Record
        </button>
      ) : null}

      <nav className="bottom-nav">
        <button
          className={tab === "home" ? "active" : ""}
          onClick={() => setTab("home")}
        >
          <HomeIcon />
        </button>
        <button
          className={tab === "split" ? "active" : ""}
          onClick={() => setTab("split")}
        >
          <UserGroupIcon />
        </button>
        <button
          className={tab === "history" ? "active" : ""}
          onClick={() => setTab("history")}
        >
          <ClockIcon />
        </button>
      </nav>

      {showExpenseModal && (
        <ExpenseModal
          form={expenseForm}
          setForm={setExpenseForm}
          close={() => setShowExpenseModal(false)}
          save={addExpense}
        />
      )}

      {showSettlement && (
        <SettlementModal
          close={() => setShowSettlement(false)}
          settlements={settlements}
        />
      )}

      {showDuckGuide && (
        <DuckGuide
          close={() => setShowDuckGuide(false)}
          duckAssets={duckAssets}
          basePath={basePath}
        />
      )}
    </main>
  );
}

function CategoryList({ items, max, currency }) {
  return (
    <div className="compact-list">
      {items.map((category) => {
        const Icon = category.icon;
        const width = (category.total / max) * 100;

        return (
          <div className="category-row" key={category.name}>
            <div className="row-left">
              <div className="icon-box">
                <Icon />
              </div>
              <div>
                <strong>{category.name}</strong>
                <div className="bar">
                  <i style={{ width: `${width}%` }} />
                </div>
              </div>
            </div>
            <b>{formatMoney(category.total, currency)}</b>
          </div>
        );
      })}
    </div>
  );
}

function TransactionList({ items, onDelete }) {
  return (
    <div className="transaction-list">
      {items.map((item) => {
        const category = categories.find((cat) => cat.name === item.category);
        const Icon = category?.icon || EllipsisHorizontalCircleIcon;

        return (
          <div className="transaction" key={item.id}>
            <div className="row-left">
              <div className="icon-box">
                <Icon />
              </div>
              <div>
                <strong>{item.category}</strong>
                <p>
                  {item.date}
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              </div>
            </div>

            <div className="amount-side">
              <b>-{formatMoney(item.amount, item.currency || "RM")}</b>
              {!item.isSplit && (
                <button className="delete-btn" onClick={() => onDelete(item.id)}>
                  <TrashIcon />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExpenseModal({ form, setForm, close, save }) {
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-head">
          <h2>Add Expense</h2>
          <button className="delete-btn" onClick={close}>
            <XMarkIcon />
          </button>
        </div>

        <form className="modal-form" onSubmit={save}>
          <div className="category-grid">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <button
                  type="button"
                  key={category.name}
                  className={
                    form.category === category.name
                      ? "category-btn active"
                      : "category-btn"
                  }
                  onClick={() => setForm({ ...form, category: category.name })}
                >
                  <Icon />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>

          <input
            type="text"
            inputMode="numeric"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) =>
              setForm({
                ...form,
                amount: formatCentsInput(e.target.value),
              })
            }
          />
          
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            {currencies.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>

          <div
            className="date-pill-field"
            onClick={() =>
              document.getElementById("expense-date-picker").showPicker?.()
            }
          >
            <CalendarDaysIcon />
            <span>
              {new Date(form.date).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <input
            id="expense-date-picker"
            className="hidden-date-input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          <input
            placeholder="Note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />

          <button className="save-btn" type="submit">
            save expense
          </button>
        </form>
      </section>
    </div>
  );
}

function DuckGuide({ close, duckAssets, basePath }) {
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="duck-room">
          <img src={`${basePath}${duckAssets.room}`} alt="Duck room" />
        </div>

        <div className="modal-head">
          <h2>Duck Evolution</h2>
          <button className="delete-btn" onClick={close}>
            <XMarkIcon />
          </button>
        </div>

        <div className="duck-guide">
          <p><b>Baby Duck</b> · Start tracking expenses.</p>
          <p><b>Explorer Duck</b> · Reach LV 5.</p>
          <p><b>Miner Duck</b> · Reach LV 10 and settle debts.</p>
          <p><b>Merchant Duck</b> · Reach LV 20 through consistent tracking.</p>
          <p><b>Duck King</b> · Reach LV 30. Emerald empire achieved.</p>
          <p className="hint">
            Expense +5 XP · Split bill +5 XP · Travel +8 XP · Settled debt +10 XP
          </p>
        </div>
      </section>
    </div>
  );
}

function SettlementModal({ close, settlements }) {
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="modal-head">
          <h2>Settlement</h2>
          <button className="delete-btn" onClick={close}>
            <XMarkIcon />
          </button>
        </div>

        <div className="settlement-list">
          {settlements.length === 0 ? (
            <p className="empty">No outstanding balances.</p>
          ) : (
            settlements.map((item, index) => (
              <div className="settlement-row" key={index}>
                <span>
                  {item.from} → {item.to}
                </span>
                <b>{formatMoney(item.amount, item.currency)}</b>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
