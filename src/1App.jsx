import { useEffect, useMemo, useState } from "react";
import "./App.css";

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

function formatRM(amount) {
  return `RM ${Number(amount || 0).toFixed(2)}`;
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

  const [expenses, setExpenses] = useState(() => {
    return JSON.parse(localStorage.getItem("ringgit_expenses")) || [];
  });

  const [friends, setFriends] = useState(() => {
    return JSON.parse(localStorage.getItem("ringgit_friends")) || [
      "Alex",
      "Ben",
    ];
  });

  const [splitBills, setSplitBills] = useState(() => {
    return JSON.parse(localStorage.getItem("ringgit_split_bills")) || [];
  });

  const [tab, setTab] = useState("home");
  const [historyMode, setHistoryMode] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "Food",
    date: todayDate,
    note: "",
  });

  const [newFriend, setNewFriend] = useState("");

  const [splitForm, setSplitForm] = useState({
    title: "",
    amount: "",
    paidBy: "You",
    date: todayDate,
    splitType: "equal",
    selectedFriends: [],
    customRows: [],
  });

  useEffect(() => {
    localStorage.setItem("ringgit_expenses", JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem("ringgit_friends", JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    localStorage.setItem("ringgit_split_bills", JSON.stringify(splitBills));
  }, [splitBills]);

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((item) => item.date.startsWith(currentMonth));
  }, [expenses, currentMonth]);

  const historyMonthExpenses = useMemo(() => {
    return expenses.filter((item) => item.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const filteredHistoryExpenses = useMemo(() => {
    if (selectedCategory === "All") return historyMonthExpenses;
    return historyMonthExpenses.filter(
      (item) => item.category === selectedCategory
    );
  }, [historyMonthExpenses, selectedCategory]);

  const totalMonth = currentMonthExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const dailyAverage = totalMonth / today.getDate();

  const categoryTotals = categories
    .map((category) => {
      const total = currentMonthExpenses
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + item.amount, 0);

      return { ...category, total };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const historyCategoryTotals = categories
    .map((category) => {
      const total = historyMonthExpenses
        .filter((item) => item.category === category.name)
        .reduce((sum, item) => sum + item.amount, 0);

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
      category: expenseForm.category,
      date: expenseForm.date,
      note: expenseForm.note.trim(),
    };

    setExpenses([newExpense, ...expenses]);

    setExpenseForm({
      amount: "",
      category: "Food",
      date: todayDate,
      note: "",
    });

    setShowExpenseModal(false);
  }

  function deleteExpense(id) {
    setExpenses(expenses.filter((item) => item.id !== id));
  }

  function addFriend(e) {
    e.preventDefault();

    const name = newFriend.trim();
    if (!name) return;
    if (friends.includes(name)) return;

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

    setSplitForm({
      ...splitForm,
      selectedFriends,
      customRows,
    });
  }

  function updateCustomValue(name, value) {
    setSplitForm({
      ...splitForm,
      customRows: splitForm.customRows.map((row) =>
        row.name === name ? { ...row, value } : row
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
      const peopleCount = splitForm.selectedFriends.length + 1;
      const perPerson = amount / peopleCount;

      owes = splitForm.selectedFriends.map((friend) => ({
        person: friend,
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
      paidBy: splitForm.paidBy.trim(),
      date: splitForm.date,
      splitType: splitForm.splitType,
      owes,
    };

    setSplitBills([newBill, ...splitBills]);

    setSplitForm({
      title: "",
      amount: "",
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
          owes: bill.owes.map((item) =>
            item.person === person
              ? { ...item, settled: !item.settled }
              : item
          ),
        };
      })
    );
  }

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
          <section className="hero-card">
            <p className="overline">Expenses This Month</p>
            <h1>{formatRM(totalMonth)}</h1>
            <span>~ {formatRM(dailyAverage)} / day</span>
          </section>

          <section className="section-card">
            <div className="section-title">
              <h2>By Category</h2>
            </div>

            {categoryTotals.length === 0 ? (
              <p className="empty">No expenses yet.</p>
            ) : (
              <div className="compact-list">
                {categoryTotals.slice(0, 3).map((category) => {
                  const Icon = category.icon;
                  const width = (category.total / maxCategory) * 100;

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

                      <b>{formatRM(category.total)}</b>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="section-card">
            <div className="section-title">
              <h2>Recent</h2>
            </div>

            {recentExpenses.length === 0 ? (
              <p className="empty">Nothing recorded.</p>
            ) : (
              <TransactionList items={recentExpenses} onDelete={deleteExpense} />
            )}
          </section>
        </>
      )}

      {tab === "split" && (
        <section className="section-card page-card">
          <div className="section-title">
            <h2>Split</h2>
          </div>

          <form className="friend-form" onSubmit={addFriend}>
            <input
              placeholder="Add friend name"
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
              type="number"
              placeholder="Total amount"
              value={splitForm.amount}
              onChange={(e) =>
                setSplitForm({ ...splitForm, amount: e.target.value })
              }
            />

            <input
              placeholder="Paid by"
              value={splitForm.paidBy}
              onChange={(e) =>
                setSplitForm({ ...splitForm, paidBy: e.target.value })
              }
            />

            <input
              type="date"
              value={splitForm.date}
              onChange={(e) =>
                setSplitForm({ ...splitForm, date: e.target.value })
              }
            />

            <div className="segmented">
              <button
                type="button"
                className={splitForm.splitType === "equal" ? "active" : ""}
                onClick={() => setSplitForm({ ...splitForm, splitType: "equal" })}
              >
                equal
              </button>

              <button
                type="button"
                className={splitForm.splitType === "custom" ? "active" : ""}
                onClick={() =>
                  setSplitForm({ ...splitForm, splitType: "custom" })
                }
              >
                custom RM
              </button>

              <button
                type="button"
                className={splitForm.splitType === "percentage" ? "active" : ""}
                onClick={() =>
                  setSplitForm({ ...splitForm, splitType: "percentage" })
                }
              >
                %
              </button>
            </div>

            {(splitForm.splitType === "custom" ||
              splitForm.splitType === "percentage") && (
              <div className="custom-split">
                <p className="hint">
                  {splitForm.splitType === "custom"
                    ? "Choose who owes you how much."
                    : "Enter each selected friend’s percentage."}
                </p>

                {splitForm.customRows.map((row) => (
                  <div className="custom-row" key={row.name}>
                    <span>{row.name}</span>
                    <input
                      type="number"
                      placeholder={
                        splitForm.splitType === "custom" ? "RM" : "%"
                      }
                      value={row.value}
                      onChange={(e) =>
                        updateCustomValue(row.name, e.target.value)
                      }
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
                      {bill.date} · {bill.paidBy} paid {formatRM(bill.amount)}
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
                    className={
                      item.settled ? "owe-line settled" : "owe-line"
                    }
                    key={item.person}
                  >
                    <span>
                      {item.person} owes {bill.paidBy}{" "}
                      <b>{formatRM(item.amount)}</b>
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
            <h2>History</h2>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />

          <div className="segmented">
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
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option>All</option>
                {categories.map((category) => (
                  <option key={category.name}>{category.name}</option>
                ))}
              </select>

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
                <div className="compact-list">
                  {historyCategoryTotals.map((category) => {
                    const Icon = category.icon;
                    const width =
                      (category.total / maxHistoryCategory) * 100;

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

                        <b>{formatRM(category.total)}</b>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      )}

      <button className="record-button" onClick={() => setShowExpenseModal(true)}>
        ◉ Record
      </button>

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
    </main>
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
              <b>-{formatRM(item.amount)}</b>

              <button className="delete-btn" onClick={() => onDelete(item.id)}>
                <TrashIcon />
              </button>
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
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />

          <input
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

export default App;