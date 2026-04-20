// ── Daily Money Challenge — Question Bank ─────────────────────────────────────
// 70-80% general business/financial knowledge
// 20-30% personalized (flagged with requiresData: true)

export type QuestionTopic =
  | "profit_loss"
  | "cash_flow"
  | "expenses"
  | "inventory"
  | "income"
  | "business_decisions"
  | "financial_habits";

export interface ChallengeQuestion {
  id: string;
  topic: QuestionTopic;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  requiresData?: boolean; // only show when user has transaction data
}

export const QUESTION_BANK: ChallengeQuestion[] = [
  // ── Profit & Loss ──────────────────────────────────────────────────────────
  {
    id: "pl_001",
    topic: "profit_loss",
    question: "You earned ₦80,000 and spent ₦50,000 this month. What is your profit?",
    options: ["₦130,000", "₦30,000", "₦50,000", "₦80,000"],
    correctIndex: 1,
    explanation: "Profit = Income − Expenses. ₦80,000 − ₦50,000 = ₦30,000. Always track both sides.",
  },
  {
    id: "pl_002",
    topic: "profit_loss",
    question: "Your revenue is ₦200,000 but your expenses are ₦220,000. What does this mean?",
    options: ["You made a profit", "You broke even", "You are running at a loss", "Your cash flow is positive"],
    correctIndex: 2,
    explanation: "When expenses exceed revenue, you are operating at a loss. This is unsustainable and must be addressed immediately.",
  },
  {
    id: "pl_003",
    topic: "profit_loss",
    question: "Which of these best describes 'gross profit'?",
    options: [
      "Revenue minus all expenses",
      "Revenue minus cost of goods sold only",
      "Total money received from customers",
      "Profit after paying taxes",
    ],
    correctIndex: 1,
    explanation: "Gross profit = Revenue − Cost of Goods Sold. It shows how efficiently you produce or buy what you sell, before other costs.",
  },
  {
    id: "pl_004",
    topic: "profit_loss",
    question: "A business earns ₦500,000 but has ₦480,000 in expenses. Is this a healthy business?",
    options: ["Yes, it's profitable", "No, the profit margin is dangerously thin", "Yes, as long as revenue is high", "It depends on the industry"],
    correctIndex: 1,
    explanation: "A 4% profit margin (₦20,000 on ₦500,000) is very thin. Any unexpected expense could push you into a loss. Aim for at least 20-30%.",
  },
  {
    id: "pl_005",
    topic: "profit_loss",
    question: "You sold a product for ₦15,000 that cost you ₦9,000 to buy. What is your profit margin?",
    options: ["40%", "60%", "9%", "15%"],
    correctIndex: 0,
    explanation: "Profit margin = (Profit ÷ Revenue) × 100 = (₦6,000 ÷ ₦15,000) × 100 = 40%. This is a healthy margin.",
  },

  // ── Cash Flow ──────────────────────────────────────────────────────────────
  {
    id: "cf_001",
    topic: "cash_flow",
    question: "A business is profitable on paper but can't pay its bills. What is the most likely problem?",
    options: ["Too much profit", "Poor cash flow management", "Too many customers", "High revenue"],
    correctIndex: 1,
    explanation: "Profit and cash flow are different. You can be profitable but still run out of cash if money isn't coming in at the right time.",
  },
  {
    id: "cf_002",
    topic: "cash_flow",
    question: "Which action improves cash flow the FASTEST?",
    options: [
      "Buying more inventory",
      "Collecting payments from customers faster",
      "Hiring more staff",
      "Expanding to a new location",
    ],
    correctIndex: 1,
    explanation: "Collecting payments faster brings cash into your business immediately. Delayed payments are one of the biggest cash flow killers.",
  },
  {
    id: "cf_003",
    topic: "cash_flow",
    question: "What does 'negative cash flow' mean?",
    options: [
      "You have no customers",
      "More money is going out than coming in",
      "Your profit is negative",
      "You have too much inventory",
    ],
    correctIndex: 1,
    explanation: "Negative cash flow means outflows exceed inflows in a period. Even profitable businesses can fail from sustained negative cash flow.",
  },
  {
    id: "cf_004",
    topic: "cash_flow",
    question: "You have ₦100,000 in sales but customers haven't paid yet. Do you have positive cash flow?",
    options: ["Yes, because you made sales", "No, cash flow depends on actual money received", "Yes, sales always equal cash", "It depends on your expenses"],
    correctIndex: 1,
    explanation: "Cash flow tracks actual money in and out. Until customers pay, that ₦100,000 is accounts receivable — not cash in hand.",
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  {
    id: "exp_001",
    topic: "expenses",
    question: "You bought goods to resell. Is this an expense or inventory?",
    options: ["Expense", "Inventory (asset)", "Revenue", "Liability"],
    correctIndex: 1,
    explanation: "Goods bought for resale are inventory — an asset. They only become an expense (Cost of Goods Sold) when you actually sell them.",
  },
  {
    id: "exp_002",
    topic: "expenses",
    question: "Which of these is a FIXED expense?",
    options: ["Cost of raw materials", "Monthly shop rent", "Delivery costs per order", "Commission paid to sales staff"],
    correctIndex: 1,
    explanation: "Fixed expenses stay the same regardless of how much you sell. Rent is fixed. Variable expenses change with your sales volume.",
  },
  {
    id: "exp_003",
    topic: "expenses",
    question: "Your transport cost increases when you sell more. This is a:",
    options: ["Fixed expense", "Variable expense", "Capital expense", "Sunk cost"],
    correctIndex: 1,
    explanation: "Variable expenses change with your business activity. Understanding this helps you price products correctly and forecast costs.",
  },
  {
    id: "exp_004",
    topic: "expenses",
    question: "Which expense should you cut FIRST when trying to reduce costs?",
    options: [
      "Expenses that generate revenue",
      "Expenses that don't directly contribute to income",
      "Staff salaries",
      "Product costs",
    ],
    correctIndex: 1,
    explanation: "Start by cutting expenses that don't generate revenue — unnecessary subscriptions, excess utilities, or non-essential services.",
  },
  {
    id: "exp_005",
    topic: "expenses",
    question: "You spend ₦5,000 on marketing and earn ₦25,000 from it. Is this a good expense?",
    options: ["No, all marketing is wasteful", "Yes, the ROI is 400%", "Only if you have surplus cash", "It depends on your mood"],
    correctIndex: 1,
    explanation: "ROI = (Return − Cost) ÷ Cost × 100 = (₦20,000 ÷ ₦5,000) × 100 = 400%. Any expense that generates more than it costs is worth it.",
  },

  // ── Inventory ──────────────────────────────────────────────────────────────
  {
    id: "inv_001",
    topic: "inventory",
    question: "You have 100 units of a product but only sell 10 per month. What is the risk?",
    options: ["Too much profit", "Dead stock tying up your cash", "High demand", "Strong business performance"],
    correctIndex: 1,
    explanation: "Overstocking ties up cash in unsold goods. That money could be used elsewhere. Always match inventory to your actual sales velocity.",
  },
  {
    id: "inv_002",
    topic: "inventory",
    question: "What does 'stock turnover' measure?",
    options: [
      "How often you restock",
      "How quickly you sell your inventory",
      "How much profit you make per item",
      "How many items you have in storage",
    ],
    correctIndex: 1,
    explanation: "Stock turnover = how many times you sell and replace inventory in a period. Higher turnover means your cash isn't sitting idle in stock.",
  },
  {
    id: "inv_003",
    topic: "inventory",
    question: "You run out of stock during peak season. What is the main consequence?",
    options: ["Lower expenses", "Lost sales and damaged customer trust", "Better cash flow", "Reduced storage costs"],
    correctIndex: 1,
    explanation: "Stockouts during peak periods mean lost revenue and customers who may not return. Forecasting demand prevents this.",
  },
  {
    id: "inv_004",
    topic: "inventory",
    question: "Which pricing strategy gives you the highest profit per unit?",
    options: [
      "Selling at cost price",
      "Selling below cost to attract customers",
      "Selling above cost with a healthy margin",
      "Matching competitor prices always",
    ],
    correctIndex: 2,
    explanation: "Profit per unit = Selling Price − Cost Price. You must price above cost to be sustainable. Know your costs before setting prices.",
  },

  // ── Income ─────────────────────────────────────────────────────────────────
  {
    id: "inc_001",
    topic: "income",
    question: "What is the difference between revenue and profit?",
    options: [
      "They are the same thing",
      "Revenue is total sales; profit is what remains after expenses",
      "Profit is total sales; revenue is what remains",
      "Revenue only includes cash sales",
    ],
    correctIndex: 1,
    explanation: "Revenue = total money earned from sales. Profit = Revenue − Expenses. A business can have high revenue but low or negative profit.",
  },
  {
    id: "inc_002",
    topic: "income",
    question: "Which income source is most valuable for long-term business stability?",
    options: ["One-time large sales", "Recurring monthly income from loyal customers", "Random seasonal income", "Income from selling assets"],
    correctIndex: 1,
    explanation: "Recurring income is predictable and stable. It allows you to plan, invest, and grow with confidence. Build systems that generate repeat business.",
  },
  {
    id: "inc_003",
    topic: "income",
    question: "You have 3 income streams. One generates 80% of your revenue. What is the risk?",
    options: [
      "No risk — focus on what works",
      "Over-dependence on one source is dangerous",
      "You should eliminate the other two",
      "This is the ideal business model",
    ],
    correctIndex: 1,
    explanation: "Over-reliance on one income source is risky. If it fails, your entire business suffers. Diversify income streams over time.",
  },

  // ── Business Decisions ─────────────────────────────────────────────────────
  {
    id: "bd_001",
    topic: "business_decisions",
    question: "Before expanding your business, what should you check first?",
    options: [
      "How many competitors you have",
      "Whether your current operations are profitable and stable",
      "How much space you need",
      "What your friends think",
    ],
    correctIndex: 1,
    explanation: "Expanding an unprofitable business just scales your losses. Ensure your core business is healthy before growing.",
  },
  {
    id: "bd_002",
    topic: "business_decisions",
    question: "A supplier offers a 20% discount if you buy 10x your normal order. Should you always take it?",
    options: [
      "Yes, discounts are always good",
      "Only if you can sell the extra stock before it ties up too much cash",
      "No, never buy in bulk",
      "Yes, more stock means more sales",
    ],
    correctIndex: 1,
    explanation: "Bulk discounts are only valuable if you can sell the stock. Buying too much ties up cash and risks dead stock. Always calculate your sales velocity first.",
  },
  {
    id: "bd_003",
    topic: "business_decisions",
    question: "You can either hire a new employee or invest in automation. Which is generally better long-term?",
    options: [
      "Always hire people",
      "Automation if it reduces cost per unit and scales without proportional cost increase",
      "Neither — keep costs low",
      "Hire first, automate later",
    ],
    correctIndex: 1,
    explanation: "Automation scales without proportional cost increases. However, the right choice depends on your specific situation, volume, and costs.",
  },
  {
    id: "bd_004",
    topic: "business_decisions",
    question: "Your best-selling product has a low profit margin. What should you do?",
    options: [
      "Stop selling it immediately",
      "Analyze if you can reduce costs or increase price without losing customers",
      "Sell more of it to compensate",
      "Ignore it since it sells well",
    ],
    correctIndex: 1,
    explanation: "High volume with low margin can still be profitable, but you should always try to improve margins. Reduce costs or test a price increase.",
  },
  {
    id: "bd_005",
    topic: "business_decisions",
    question: "What is the MOST important number to track in your business daily?",
    options: ["Number of customers", "Cash in hand and daily profit/loss", "Number of products sold", "Social media followers"],
    correctIndex: 1,
    explanation: "Cash position and daily P&L tell you if your business is healthy right now. Without this, you're flying blind.",
  },

  // ── Financial Habits ───────────────────────────────────────────────────────
  {
    id: "fh_001",
    topic: "financial_habits",
    question: "Why should you separate your personal and business finances?",
    options: [
      "It's not necessary for small businesses",
      "To accurately track business performance and avoid mixing personal spending",
      "Only for tax purposes",
      "To impress investors",
    ],
    correctIndex: 1,
    explanation: "Mixing personal and business finances makes it impossible to know if your business is truly profitable. Separate accounts are essential from day one.",
  },
  {
    id: "fh_002",
    topic: "financial_habits",
    question: "How often should a small business owner review their finances?",
    options: ["Once a year", "Only when there's a problem", "Daily or weekly", "Monthly is enough"],
    correctIndex: 2,
    explanation: "Daily or weekly reviews catch problems early. Waiting until year-end means small issues become big crises. Make it a habit.",
  },
  {
    id: "fh_003",
    topic: "financial_habits",
    question: "What percentage of revenue should a healthy business save as an emergency fund?",
    options: ["0% — reinvest everything", "3–6 months of operating expenses", "50% of all revenue", "Only save when profitable"],
    correctIndex: 1,
    explanation: "An emergency fund of 3–6 months of expenses protects your business from unexpected downturns, slow seasons, or emergencies.",
  },
  {
    id: "fh_004",
    topic: "financial_habits",
    question: "You made ₦200,000 profit this month. What should you do first?",
    options: [
      "Spend it all on personal expenses",
      "Allocate it: reinvestment, savings, and personal pay",
      "Buy more inventory immediately",
      "Wait and see what happens next month",
    ],
    correctIndex: 1,
    explanation: "Smart profit allocation: reinvest in the business, save a portion, and pay yourself. Never spend all profit — it's your business's fuel.",
  },
  {
    id: "fh_005",
    topic: "financial_habits",
    question: "What is the danger of taking loans to cover operating expenses?",
    options: [
      "Loans are always bad",
      "It means your business isn't generating enough cash to sustain itself",
      "It improves your credit score",
      "It's a smart growth strategy",
    ],
    correctIndex: 1,
    explanation: "Using loans for day-to-day expenses signals a cash flow problem. Loans should fund growth, not survival. Fix the underlying issue first.",
  },
  {
    id: "fh_006",
    topic: "financial_habits",
    question: "True or False: Recording every transaction, no matter how small, is important.",
    options: ["True", "False — only large transactions matter", "Only for tax season", "Only if you have an accountant"],
    correctIndex: 0,
    explanation: "Small transactions add up. ₦500 here and ₦1,000 there can become ₦50,000 in untracked expenses monthly. Every naira counts.",
  },

  // ── More Profit & Loss ─────────────────────────────────────────────────────
  {
    id: "pl_006",
    topic: "profit_loss",
    question: "What does a 'break-even point' mean?",
    options: [
      "When you stop making sales",
      "When revenue exactly covers all expenses — zero profit, zero loss",
      "When you have equal income and savings",
      "When your business is at its peak",
    ],
    correctIndex: 1,
    explanation: "Break-even is when revenue = total costs. Every sale above break-even generates profit. Know your break-even to set realistic sales targets.",
  },
  {
    id: "pl_007",
    topic: "profit_loss",
    question: "Which is more important: high revenue or high profit margin?",
    options: [
      "High revenue always",
      "High profit margin — you keep more of what you earn",
      "They are equally important",
      "Neither matters if you have customers",
    ],
    correctIndex: 1,
    explanation: "A business with ₦1M revenue and 5% margin keeps ₦50,000. One with ₦300,000 revenue and 40% margin keeps ₦120,000. Margin matters more.",
  },

  // ── More Cash Flow ─────────────────────────────────────────────────────────
  {
    id: "cf_005",
    topic: "cash_flow",
    question: "You have ₦500,000 in unpaid invoices. How does this affect your business?",
    options: [
      "No effect — it's still profit",
      "Your cash flow suffers even though you're technically profitable",
      "It improves your balance sheet",
      "It means you have too many customers",
    ],
    correctIndex: 1,
    explanation: "Unpaid invoices are accounts receivable — not cash. You can't pay suppliers or staff with invoices. Chase payments aggressively.",
  },

  // ── More Inventory ─────────────────────────────────────────────────────────
  {
    id: "inv_005",
    topic: "inventory",
    question: "What is 'dead stock'?",
    options: [
      "Expired products only",
      "Inventory that hasn't sold and is unlikely to sell",
      "Products with low profit margins",
      "Stock that was returned by customers",
    ],
    correctIndex: 1,
    explanation: "Dead stock ties up cash and storage space. It often needs to be discounted or written off. Prevent it by ordering based on actual demand.",
  },

  // ── More Business Decisions ────────────────────────────────────────────────
  {
    id: "bd_006",
    topic: "business_decisions",
    question: "A customer asks for a 30% discount on a large order. Your margin is 35%. Should you accept?",
    options: [
      "Yes, volume always compensates",
      "Only if the remaining 5% margin still covers your fixed costs",
      "Never give discounts",
      "Yes, customer satisfaction is everything",
    ],
    correctIndex: 1,
    explanation: "Discounts eat into margins. A 30% discount on a 35% margin leaves only 5%. Calculate if that still covers your costs before agreeing.",
  },
  {
    id: "bd_007",
    topic: "business_decisions",
    question: "What is the first thing to do when your business is losing money?",
    options: [
      "Take a loan to cover losses",
      "Identify whether the problem is low revenue, high costs, or both",
      "Close the business",
      "Hire more staff to increase sales",
    ],
    correctIndex: 1,
    explanation: "Diagnose before prescribing. Is revenue too low? Are costs too high? Both? The solution depends entirely on the root cause.",
  },
];

// Get questions for today based on user data availability
export function getDailyQuestions(
  hasUserData: boolean,
  answeredIds: string[],
  count = 2
): ChallengeQuestion[] {
  const available = QUESTION_BANK.filter(q => {
    if (answeredIds.includes(q.id)) return false;
    if (q.requiresData && !hasUserData) return false;
    return true;
  });

  if (available.length === 0) {
    // All answered — reset and pick from full bank
    return QUESTION_BANK.slice(0, count);
  }

  // Shuffle and pick
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
