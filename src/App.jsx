import { useEffect, useState } from "react";
import "./App.css";
import { createWorker, PSM } from "tesseract.js";

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
  CameraIcon,
  PlusIcon,
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

function parseReceiptDate(text) {
  const match = text.match(
    /\b(?:(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4}))\b/
  );
  if (!match) return "";

  let year = match[1] || match[6];
  const month = match[2] || match[5];
  const day = match[3] || match[4];
  if (year.length === 2) year = `20${year}`;

  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function parseReceiptText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const amountAtEnd =
    /(?:RM|MYR|SGD|\$)?\s*(\d{1,3}(?:,\d{3})*\.\d{2}|\d{1,6}[,.]\d{2})\s*$/i;
  const totalWords = /\b(grand\s*total|amount\s*due|balance\s*due|net\s*total|total)\b/i;
  const excludedTotalWords =
    /\b(sub\s*total|subtotal|tax|gst|sst|change|cash|rounding|saving|discount)\b/i;
  const toAmount = (value) =>
    Number(
      value.includes(".") ? value.replaceAll(",", "") : value.replace(",", ".")
    );

  const preferredTotals = lines
    .filter(
      (line) => totalWords.test(line) && !excludedTotalWords.test(line)
    )
    .map((line) => line.match(amountAtEnd))
    .filter(Boolean)
    .map((match) => toAmount(match[1]));

  const allAmounts = lines
    .map((line) => line.match(amountAtEnd))
    .filter(Boolean)
    .map((match) => toAmount(match[1]))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  const merchant =
    lines.find(
      (line) =>
        line.length >= 3 &&
        line.length <= 60 &&
        /[a-z]/i.test(line) &&
        !/\b(receipt|invoice|tax|date|time|cashier|table|order)\b/i.test(line) &&
        !/\d{4,}/.test(line)
    ) || "";

  return {
    amount: preferredTotals.at(-1) || (allAmounts.length ? Math.max(...allAmounts) : 0),
    date: parseReceiptDate(text),
    merchant,
    rawText: text.trim(),
  };
}

let openCvLoadPromise;

function loadOpenCvScript() {
  if (window.cv) return Promise.resolve();
  if (openCvLoadPromise) return openCvLoadPromise;

  openCvLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${import.meta.env.BASE_URL}vendor/opencv/opencv.js`;
    script.async = true;
    script.dataset.opencv = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("OpenCV script failed to load"));
    document.head.appendChild(script);
  });

  return openCvLoadPromise;
}

async function waitForOpenCv(timeoutMs = 30000) {
  await loadOpenCvScript();
  const startedAt = performance.now();

  while (performance.now() - startedAt < timeoutMs) {
    let cv = window.cv;
    if (cv instanceof Promise) cv = await cv;
    if (cv?.Mat) return cv;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("OpenCV did not finish loading");
}

async function preprocessReceipt(imageData) {
  const cv = await waitForOpenCv();
  const image = new Image();
  image.src = imageData;
  await image.decode();

  const inputCanvas = document.createElement("canvas");
  inputCanvas.width = image.naturalWidth;
  inputCanvas.height = image.naturalHeight;
  inputCanvas.getContext("2d").drawImage(image, 0, 0);

  const outputCanvas = document.createElement("canvas");
  const source = cv.imread(inputCanvas);
  const grayscale = new cv.Mat();
  const denoised = new cv.Mat();
  const binary = new cv.Mat();
  const bordered = new cv.Mat();

  try {
    cv.cvtColor(source, grayscale, cv.COLOR_RGBA2GRAY);
    cv.medianBlur(grayscale, denoised, 3);
    cv.adaptiveThreshold(
      denoised,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      31,
      12
    );
    cv.copyMakeBorder(
      binary,
      bordered,
      20,
      20,
      20,
      20,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );
    cv.imshow(outputCanvas, bordered);
    return outputCanvas.toDataURL("image/png");
  } finally {
    source.delete();
    grayscale.delete();
    denoised.delete();
    binary.delete();
    bordered.delete();
  }
}

function receiptResultScore(result) {
  const parsed = parseReceiptText(result.data.text);
  return (
    Number(result.data.confidence || 0) +
    (parsed.amount ? 40 : 0) +
    (parsed.date ? 15 : 0) +
    (parsed.merchant ? 10 : 0)
  );
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

  const [tab, setTab] = useState("home");
  const [historyMode, setHistoryMode] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [newFriend, setNewFriend] = useState("");

  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    currency: mainCurrency,
    category: "Food",
    date: todayDate,
    note: "",
    receipt: "",
    receiptText: "",
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
    itemRows: [],
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

  const currentMonthPersonalExpenses = expenses.filter(
    (item) =>
      item.date.startsWith(currentMonth) && item.currency === mainCurrency
  );

  const currentMonthSplitExpenses = splitBills
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

  const currentMonthExpenses = [
    ...currentMonthPersonalExpenses,
    ...currentMonthSplitExpenses,
  ];

  const historyPersonalExpenses = expenses.filter(
    (item) =>
      item.date.startsWith(selectedMonth) && item.currency === mainCurrency
  );

  const historySplitExpenses = splitBills
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
      id: crypto.randomUUID(),
      amount: Number(expenseForm.amount),
      currency: expenseForm.currency,
      category: expenseForm.category,
      date: expenseForm.date,
      note: expenseForm.note.trim(),
      receipt: expenseForm.receipt,
      receiptText: expenseForm.receiptText,
    };

    setExpenses([newExpense, ...expenses]);
    setExpenseForm({
      amount: "",
      currency: mainCurrency,
      category: "Food",
      date: todayDate,
      note: "",
      receipt: "",
      receiptText: "",
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
      itemRows: splitForm.itemRows.filter((row) => row.name !== name),
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

    const itemRows = selected
      ? splitForm.itemRows.filter((row) => row.name !== name)
      : [
          ...splitForm.itemRows,
          { name, items: [{ id: crypto.randomUUID(), label: "", amount: "" }] },
        ];

    setSplitForm({ ...splitForm, selectedFriends, customRows, itemRows });
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

  function selectSplitType(splitType) {
    const hasYou = splitForm.itemRows.some((row) => row.name === "You");
    setSplitForm({
      ...splitForm,
      splitType,
      itemRows:
        splitType === "items" && !hasYou
          ? [
              {
                name: "You",
                items: [
                  { id: crypto.randomUUID(), label: "", amount: "" },
                ],
              },
              ...splitForm.itemRows,
            ]
          : splitForm.itemRows,
    });
  }

  function addPersonItem(name) {
    setSplitForm({
      ...splitForm,
      itemRows: splitForm.itemRows.map((row) =>
        row.name === name
          ? {
              ...row,
              items: [
                ...row.items,
                { id: crypto.randomUUID(), label: "", amount: "" },
              ],
            }
          : row
      ),
    });
  }

  function updatePersonItem(name, itemId, field, value) {
    setSplitForm({
      ...splitForm,
      itemRows: splitForm.itemRows.map((row) =>
        row.name === name
          ? {
              ...row,
              items: row.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      [field]:
                        field === "amount" ? formatCentsInput(value) : value,
                    }
                  : item
              ),
            }
          : row
      ),
    });
  }

  function removePersonItem(name, itemId) {
    setSplitForm({
      ...splitForm,
      itemRows: splitForm.itemRows.map((row) =>
        row.name === name
          ? {
              ...row,
              items: row.items.filter((item) => item.id !== itemId),
            }
          : row
      ),
    });
  }

  const itemizedRows = splitForm.itemRows;

  const itemizedTotal = itemizedRows.reduce(
    (total, row) =>
      total +
      row.items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    0
  );

  function addSplitBill(e) {
    e.preventDefault();

    const amount =
      splitForm.splitType === "items"
        ? itemizedTotal
        : Number(splitForm.amount);
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

    if (splitForm.splitType === "items") {
      owes = itemizedRows
        .map((row) => ({
          person: row.name,
          amount: row.items.reduce(
            (sum, item) => sum + Number(item.amount || 0),
            0
          ),
          settled: false,
        }))
        .filter(
          (row) => row.person !== splitForm.paidBy && row.amount > 0
        );
    }

    const newBill = {
      id: crypto.randomUUID(),
      title: splitForm.title.trim(),
      amount,
      currency: splitForm.currency,
      category: splitForm.category,
      paidBy: splitForm.paidBy.trim(),
      date: splitForm.date,
      splitType: splitForm.splitType,
      owes,
      itemRows: splitForm.splitType === "items" ? itemizedRows : undefined,
    };

    setSplitBills([newBill, ...splitBills]);
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
      itemRows: [],
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

            {splitForm.splitType !== "items" && (
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
            )}

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
              {["equal", "custom", "percentage", "items"].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={splitForm.splitType === type ? "active" : ""}
                  onClick={() => selectSplitType(type)}
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

            {splitForm.splitType === "items" && (
              <div className="itemized-split">
                <p className="hint">
                  Add every charge to the person who ordered it.
                </p>

                {itemizedRows.map((row) => {
                  const personTotal = row.items.reduce(
                    (sum, item) => sum + Number(item.amount || 0),
                    0
                  );

                  return (
                    <section className="person-calculator" key={row.name}>
                      <div className="person-calculator-head">
                        <strong>{row.name}</strong>
                        <b>
                          {formatMoney(personTotal, splitForm.currency)}
                        </b>
                      </div>

                      {row.items.map((item) => (
                        <div className="person-item-row" key={item.id}>
                          <input
                            aria-label={`${row.name} item`}
                            placeholder="Item"
                            value={item.label}
                            onChange={(e) =>
                              updatePersonItem(
                                row.name,
                                item.id,
                                "label",
                                e.target.value
                              )
                            }
                          />
                          <input
                            aria-label={`${row.name} item amount`}
                            type="text"
                            inputMode="numeric"
                            placeholder="0.00"
                            value={item.amount}
                            onChange={(e) =>
                              updatePersonItem(
                                row.name,
                                item.id,
                                "amount",
                                e.target.value
                              )
                            }
                          />
                          <button
                            className="mini-delete-btn"
                            type="button"
                            aria-label={`Remove ${row.name} item`}
                            onClick={() =>
                              removePersonItem(row.name, item.id)
                            }
                          >
                            <XMarkIcon />
                          </button>
                        </div>
                      ))}

                      <button
                        className="add-item-btn"
                        type="button"
                        onClick={() => addPersonItem(row.name)}
                      >
                        <PlusIcon /> add item
                      </button>
                    </section>
                  );
                })}

                <div className="split-grand-total">
                  <span>Bill total</span>
                  <strong>
                    {formatMoney(itemizedTotal, splitForm.currency)}
                  </strong>
                </div>
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

                {bill.itemRows?.map((row) => {
                  const items = row.items.filter(
                    (item) => Number(item.amount || 0) > 0
                  );
                  if (items.length === 0) return null;

                  return (
                    <div className="saved-item-breakdown" key={row.name}>
                      <strong>{row.name}</strong>
                      {items.map((item) => (
                        <span key={item.id}>
                          {item.label || "Item"}{" "}
                          <b>{formatMoney(item.amount, bill.currency)}</b>
                        </span>
                      ))}
                    </div>
                  );
                })}

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
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");
  const [scanError, setScanError] = useState("");

  async function scanReceipt(imageData) {
    setScanError("");
    setScanProgress(0);
    setScanStatus("Enhancing receipt image");

    let worker;
    try {
      let enhancedImage = "";
      try {
        enhancedImage = await preprocessReceipt(imageData);
      } catch (error) {
        console.warn("OpenCV preprocessing unavailable; using original", error);
      }

      let progressBase = 0;
      let progressScale = enhancedImage ? 0.5 : 1;
      worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (message.status) setScanStatus(message.status);
          if (typeof message.progress === "number") {
            setScanProgress(
              Math.round((progressBase + message.progress * progressScale) * 100)
            );
          }
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });

      const results = [];
      if (enhancedImage) {
        setScanStatus("Scanning enhanced receipt");
        results.push(await worker.recognize(enhancedImage));
        progressBase = 0.5;
        progressScale = 0.5;
      }

      setScanStatus("Checking original receipt");
      results.push(await worker.recognize(imageData));

      const result = results.sort(
        (left, right) => receiptResultScore(right) - receiptResultScore(left)
      )[0];
      const parsed = parseReceiptText(result.data.text);

      setForm((current) => ({
        ...current,
        amount: parsed.amount ? parsed.amount.toFixed(2) : current.amount,
        date: parsed.date || current.date,
        note: parsed.merchant || current.note,
        receiptText: parsed.rawText,
      }));
      setScanProgress(100);
      setScanStatus(
        parsed.amount
          ? "Receipt scanned — please check the details"
          : "Scan complete — enter the total manually"
      );
    } catch (error) {
      console.error("Receipt scan failed", error);
      setScanError(
        "The receipt could not be read. You can still enter the details manually."
      );
      setScanStatus("");
    } finally {
      if (worker) await worker.terminate();
    }
  }

  function attachReceipt(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const ocrMaxSide = 2400;
        const ocrScale = Math.min(
          ocrMaxSide / image.width,
          ocrMaxSide / image.height,
          1
        );
        const ocrCanvas = document.createElement("canvas");
        ocrCanvas.width = Math.round(image.width * ocrScale);
        ocrCanvas.height = Math.round(image.height * ocrScale);
        ocrCanvas
          .getContext("2d")
          .drawImage(image, 0, 0, ocrCanvas.width, ocrCanvas.height);
        const ocrReceipt = ocrCanvas.toDataURL("image/jpeg", 0.9);

        const storedMaxSide = 1200;
        const storedScale = Math.min(
          storedMaxSide / image.width,
          storedMaxSide / image.height,
          1
        );
        const storedCanvas = document.createElement("canvas");
        storedCanvas.width = Math.round(image.width * storedScale);
        storedCanvas.height = Math.round(image.height * storedScale);
        storedCanvas
          .getContext("2d")
          .drawImage(image, 0, 0, storedCanvas.width, storedCanvas.height);
        const receipt = storedCanvas.toDataURL("image/jpeg", 0.75);

        setForm((current) => ({
          ...current,
          receipt,
          receiptText: "",
        }));
        scanReceipt(ocrReceipt);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

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

            <label className="date-pill-field">
              <CalendarDaysIcon />

              <span>
              {new Date(form.date).toLocaleDateString("en-MY", {
              day: "numeric",
              month: "short",
              year: "numeric",
             })}
          </span>

              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="hidden-date-input"
              />
            </label>
          
          <input
            placeholder="Note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />

          <label className="receipt-capture">
            <CameraIcon />
            <span>{form.receipt ? "Retake receipt" : "Take receipt photo"}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={attachReceipt}
            />
          </label>

          {form.receipt && (
            <div className="receipt-preview">
              <img src={form.receipt} alt="Receipt preview" />
              <button
                className="delete-btn"
                type="button"
                aria-label="Remove receipt"
                onClick={() => {
                  setForm({ ...form, receipt: "", receiptText: "" });
                  setScanStatus("");
                  setScanError("");
                  setScanProgress(0);
                }}
              >
                <TrashIcon />
              </button>
            </div>
          )}

          {(scanStatus || scanError) && (
            <div
              className={scanError ? "receipt-scan-status error" : "receipt-scan-status"}
              role="status"
            >
              <span>{scanError || scanStatus}</span>
              {!scanError && scanProgress < 100 && (
                <div className="scan-progress" aria-label={`${scanProgress}%`}>
                  <i style={{ width: `${scanProgress}%` }} />
                </div>
              )}
            </div>
          )}

          <button
            className="save-btn"
            type="submit"
            disabled={Boolean(scanStatus && scanProgress < 100 && !scanError)}
          >
            {scanStatus && scanProgress < 100 && !scanError
              ? "scanning receipt..."
              : "save expense"}
          </button>
        </form>
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
