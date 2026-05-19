# PUSL3190 Computing Project — Ultimate Viva Voce Defense & Demo Manual
**Smart Financial Tracker (SFT) — final-year Project Defense**

*   **Student Name:** Nethusara Mervin
*   **Plymouth Student Index Number:** `10953504`
*   **Project Supervisor:** Ms. Yasanthika Mathotaarachchi
*   **Academic Institutions:** NSBM Green University / University of Plymouth
*   **Module Code:** PUSL3190 Computing Project
*   **Viva Voce Date:** Starting 18th May (Current Local Time: 2026-05-18)

---

## 🛡️ EXAM-DAY CRITICAL CHECKLIST (DO NOT FORGET!)
1.  **Punctuality & Attire:** Dress SMART (formal wear). Be logged in and ready 10-15 minutes before your slot.
2.  **Screen Recording (MANDATORY):** **Start your screen recording software immediately** as you join the session. Ensure your video camera remains switched ON throughout. *Failing to record your viva results in a mark of ZERO.*
3.  **Local Server Setup:** Before the panel joins, make sure your services are active:
    *   **Backend API Server:** Node.js running on Port `5000` (`npm run dev` in `backend/`).
    *   **Frontend Client:** React UI running on Port `5173` or equivalent (`npm run dev` in `frontend/`).
    *   **ML Microservice:** Flask running on Port `5055` (`python app.py` or equivalent in `ml-service/`).
4.  **Credentials & Passwords:** Memorize your test credentials. Do not fumble or spend time searching for passwords during the 15-minute live demonstration!
    *   *Demo Account:* Register/use a clean test account with an easy-to-remember password (e.g., `SftUser@1234` matching your alphanumeric validation rule).

---

## 📈 PART 1: The PPT Presentation Script (5-Minute Speed Run)

You have exactly **5 minutes** to showcase your poster/presentation slides. Do not read the slides; deliver this structured, professional academic narrative.

```
       00:00 ──► Slide 1: Title & Index
       01:00 ──► Slide 2: The Cognitive Problem (Behavioral Economics)
       02:00 ──► Slide 3: SMART Aim & Objectives (Overall Use Case)
       03:00 ──► Slide 4: Literature Review (Comparative Matrix)
       04:00 ──► Slide 5: Engineering Stack & Architecture
       05:00 ──► Slide 6: Testing & Feasibility (Transition to Demo)
```

### Slide 1: Title & Project Showcase
*   **Speech:** *"Good morning/afternoon, esteemed panel members. I am Nethusara Mervin, Plymouth Student Index 10953504. Under the supervision of Ms. Yasanthika Mathotaarachchi, I am presenting my final-year project: the Smart Financial Tracker, or SFT. SFT is a cognitive-engagement-first personal wealth management system that integrates predictive machine learning and context-aware natural language processing."*

### Slide 2: The Real Problem (The Invisible Economy)
*   **Speech:** *"Why does SFT exist? In today's digital economy, contactless payments, mobile pay, and card transactions have removed what behavioral psychologists call the 'pain of paying'. This physical decoupling of transactions from cash currency leads to blind spending and high debt. Existing tools in the market are either too complex (like YNAB), leading to fast user abandonment, or completely automated (like Mint), which breeds financial detachment because the user never actively engages with their data. SFT is designed to bridge this exact gap."*

### Slide 3: Aim & Objectives (With Overall Use Case Diagram)
*   **Speech:** *"The main aim of this project is to develop a personal finance system that fosters financial mindfulness through active manual logging, while rewarding users with advanced predictive forecasting and automated security. To achieve this, I established four core objectives:
    1.  Develop an optimized, manual-entry CRUD transaction engine to boost user mindfulness.
    2.  Implement adaptive budgeting with real-time volatility alerts at 80%, 90%, and 100% utilization.
    3.  Build a highly secure P2P wallet system using atomic database sessions and dynamic risk evaluation.
    4.  Integrate a predictive ML analytics service for category expenditure forecasting and retirement planning.
    
    *As shown in my Overall Use Case Diagram, the system separates actions between two primary actors: the standard User, who CRUDs transactions, transfers funds, and interrogates the AI Assistant, and the System Administrator, who reviews transaction volumes, manages user accounts, and authorizes admin promotions."*

### Slide 4: Literature Review (The Competitive Gap)
*   **Speech:** *"To validate the uniqueness of SFT, I completed a competitive analysis against the market standard platforms:"*

| Comparison Criteria | YNAB (You Need A Budget) | Mint (Legacy Automated) | SFT (Smart Financial Tracker) |
| :--- | :--- | :--- | :--- |
| **Data Ingestion** | Strict Manual (High Friction) | Fully Automated (Zero Friction) | **Mindful CRUD Manual Entry** |
| **Cognitive Habit** | High (User gets overwhelmed) | Low (User ignores automated notifications) | **High (Gamified via Health Score)** |
| **ML Projections** | None (Static rules only) | None (Historical lists only) | **Random Forest Predictive Regressor** |
| **Internal Wallet** | None (Tracking only) | None (Aggregator only) | **Atomic P2P Wallet (ACID Ledger)** |
| **AI Integration** | None | Basic generic alerts | **Tracksy AI (Context-aware Llama-3)** |

### Slide 5: System Design & Technical Stack
*   **Speech:** *"SFT is built as a distributed, decoupled MVC-Lite architecture. I chose the MERN Stack — React 19, Express 5, Node.js, and MongoDB — for a unified, asynchronous JavaScript pipeline. For analytical operations, I decoupled the stack, building a Python Flask microservice on Port 5055 to handle CPU-heavy Scikit-Learn training. SFT's security uses stateless JWT tokens in HTTP Authorization headers, and atomic transactions to guarantee wallet ledger integrity. Finally, all long-running schedulers are separated into an isolated background node process (worker.js) to keep our API main thread unblocked."*

### Slide 6: Testing & Feasibility (Transition to Demo)
*   **Speech:** *"Feasibility was proven via comprehensive test coverage: Jest for backend unit integration, Vitest for frontend utility validations, and Playwright for E2E user-flow simulations, ensuring a 100% pass rate on money transfers. The system delivers sub-second response times, proving its commercial viability. I will now transition directly to the live demonstration to show SFT in action."*

---

## 💻 PART 2: The Live Demonstration Script (15-Minute Play-by-Play)

This is your core showcase. Be deliberate, show exact screens, and explain the underlying computer science as you click.

```
 Register/Login (Bcrypt & Password Regex)
       │
       ▼
 Dashboard CRUD ──► Real-time Admin Sync (React Query 4s Polling)
       │
       ▼
 Sync/Adjust Budget ──► Alert Threshold Trigger (80%/90%/100% State Locks)
       │
       ▼
 Savings Goal Contribution ──► Linked Transaction Generation
       │
       ▼
 P2P Transfer ──► Risk Score ──► SMS Fail ──► Email OTP Fallback ──► ACID Commit
       │
       ▼
 Analytics Charts (Recharts + MongoDB aggregation)
       │
       ▼
 Tracksy AI (Local Set Greeting Bypass ──► Groq Llama-3 NLP)
       │
       ▼
 ML Forecast (Random Forest Regressor & polyfit Trendline)
```

### Step 1: User Registration, Login & Bcrypt Security (2 Minutes)
*   **Action:** Go to the Registration screen. Type an invalid email (e.g., `invalidemail`) and a weak password (e.g., `123`). Show the validation errors. Then register a clean account with a secure alphanumeric password (e.g., `SftUser@10953504`).
*   **Technical Defense Wording:** *"Here, I am demonstrating our front-end validation. The password fields enforce alphanumeric and special character constraints using strict regular expressions. On the back-end, we enforce these checks again. Passwords are never stored in plain text. I salt and hash them using the **Bcrypt.js** algorithm with 10 rounds of computational complexity. Even if an intruder dumps our MongoDB collection, the plain-text passwords cannot be reversed."*
*   **Action:** Log in with your new account.

### Step 2: Real-Time Interconnection & Admin Panel Sync (2 Minutes)
*   **Action:** Open two browser windows side-by-side: one with your standard User Dashboard, and one with the Admin Dashboard.
*   **Action:** In the User Dashboard, add a new transaction (e.g., Income: Salary of `$5,000`). Watch the side-by-side Admin Dashboard. Within 4 seconds, the admin transaction list will automatically update showing your new income transaction!
*   **Technical Defense Wording:** *"Notice the side-by-side interconnection. I just logged a transaction in our user panel, and the transaction list inside the admin panel updated automatically without a full page refresh. To achieve this stateless synchronization without draining server sockets like WebSockets, I implemented **TanStack React Query active polling**. The admin panel triggers background HTTP queries to the backend every 4 seconds (`refetchInterval: 4000`) only when the modal is active in the viewport. This gives an instantaneous real-time experience with minimal network overhead."*

### Step 3: Adaptive Budgeting & State-Locked Alerts (2 Minutes)
*   **Action:** Go to the Budgets page. Show the configured Monthly Salary and Savings Percentage. If not already populated, click **Sync Category Budgets** to dynamically generate the standard category budgets balanced against the `other expense` buffer.
*   **Action:** Click the edit (pencil) icon next to the `Dining Out` category. Adjust its limit to `$100`, choose `80%` as the alert threshold, and save the change (explain that SFT automatically rebalances the difference from the `other expense` buffer).
*   **Action:** Go to Transactions, log an expense of `$82` under `Dining Out`. Show the instant alert message appearing on screen. Explain that an email was sent.
*   **Action:** Log a second expense of `$3` bringing the total spent to `$85` (still under the 90% threshold). Note that no duplicate email was sent.
*   **Technical Defense Wording:** *"SFT implements real-time budget threshold evaluation. Instead of using an unconstrained budget model where users create arbitrary limits, SFT implements a **zero-based balanced budgeting system**. The sum of all category limits is strictly constrained to the user's usable income: $Salary - Savings$. The standard categories are dynamically generated and balanced against an `other expense` buffer. In this demo, I adjusted the Dining Out limit to $100. When I logged the $82 expense, it represented 82% of the budget, crossing the 80% limit. The system instantly generated an in-app notification and triggered a server-side Nodemailer email. However, when I added another $3 expense bringing us to 85%, the system checked the database, saw that `lastAlertLevel` was already set to '80', and gracefully skipped sending a duplicate alert. This state-locking mechanism prevents email spam. If I delete a transaction bringing spending below 80%, the budget state resets to null."*

### Step 4: Savings Goals & Linked Double-Entry Logs (2 Minutes)
*   **Action:** Go to the Goals page. Create a goal (e.g., Name: `Trip to Plymouth`, Target: `$1,000`, Current: `$500`).
*   **Action:** Click 'Contribute', enter `$500`. Watch the goal status instantly change to **Completed** and the progress bar reach 100%.
*   **Action:** Go back to the Transactions screen. Point out that a transaction has automatically appeared: Expense, Category: `goal_contribution`, Amount: `$500`, Scope: `savings`.
*   **Technical Defense Wording:** *"When I make a contribution to a savings goal, SFT automatically increments the `currentAmount` using a mathematical cap: `Math.min(goal.currentAmount + contributionAmount, goal.targetAmount)`. Once they align, the status is set to 'completed'. To ensure that cash-flow calculations remain synchronized, SFT automatically triggers a double-entry database transaction with category 'goal_contribution' and scope 'savings'. This tells our financial health algorithms that this money was saved as net wealth rather than spent on variable expenses."*

### Step 5: Secure P2P Wallet Transfer (The Showstopper) (3 Minutes)
*   **Action:** Click on the Wallet page. Enter a receiver's username (e.g., another test user). Enter an amount (e.g., `$100`).
*   **Action:** Trigger the OTP. Explain that the system attempts to send a secure 6-digit verification code to the user's phone via the **Twilio SMS API**.
*   **Action:** *Graceful Degradation Demonstration:* Simulate or explain that if Twilio fails (due to lack of balance, rate limits, or network errors), SFT catches the error and **instantly emails the OTP** via Gmail/Nodemailer instead. Enter the OTP code from your email or log console and execute the transfer.
*   **Technical Defense Wording:** *"This is SFT's core P2P wallet system. When a transfer is requested, the system calculates a dynamic Risk Score from 0 to 100 based on recipient history, velocity, and daily transaction limits. A secure 6-digit OTP is mathematically generated and stored in the database with a 5-minute expiry. If our Twilio SMS channel degrades, SFT catches the error and seamlessly falls back to Nodemailer email OTP, ensuring the user is never blocked.
    
    To secure the funds, the entire transfer is wrapped in a **Mongoose session transaction**. Mongoose starts a session, starts a transaction, deducts the sender's balance, increases the receiver's balance, logs two system-managed sent/received transaction models (debit and credit entries) to preserve overall cash-flow balances, and records the transfer in the `Transfer` collection for immutable audit tracking. If any database write fails during this chain, the entire transaction is rolled back atomically, guaranteeing that not a single cent is ever lost. LedgerEntry records, which prevent updates and deletion, are reserved for wallet top-ups and withdrawals for a strict auditing trail."*

### Step 6: Data Visualization & Reports (1 Minute)
*   **Action:** Go to the Insights / Reports page. Click around the charts, hover over categories.
*   **Technical Defense Wording:** *"All SFT charts are drawn in real-time using **Recharts**, which compiles JSON data from our backend directly into responsive vector SVG paths on the browser DOM. The backend Express API server obtains this data instantly by running MongoDB aggregation pipelines using `$match` and `$group` operations, which summarize millions of transactions in microseconds."*

### Step 7: Tracksy AI Chatbot & ML Projections (3 Minutes)
*   **Action:** Open the draggable Tracksy AI widget at the bottom right. Move it slightly on the screen.
*   **Action:** Type a greeting: *"Hi"* or *"Hello"*. Watch it reply instantly (<5ms).
*   **Action:** Type: *"Am I over budget?"* or *"What's my worst spending habit?"*. Watch it compute the answer dynamically and print it.
*   **Action:** Type: *"Can you suggest a strategy to cut my dining expenses?"*. Watch it query the Groq LLM (Llama 3) and return a 2-sentence financial advice.
*   **Technical Defense Wording:** *"Our AI Assistant, Tracksy, runs as a floating, draggable React component. To make it extremely cost-effective and low-latency, I engineered a **multi-tier efficiency pipeline**:
    1.  **Greeting Bypass:** Simple words like 'hi' are captured by a local lookup set and returned instantly under 5ms without calling any server APIs.
    2.  **Deterministic Math Path:** Standard financial queries (like worst spending habits or budget status) are computed directly on our local MongoDB using clean aggregate math, returning 100% accurate statistics without risking LLM hallucinations.
    3.  **Groq API (Llama-3):** For complex queries, SFT bundles the user's details, truncated to 5,000 characters, and securely queries Llama-3.1-8b-instant on Groq for swift, personalized guidance."*
*   **Action:** Navigate to the ML Expense Forecast screen. Show the Random Forest monthly spending forecast curve.
*   **Technical Defense Wording:** *"Finally, this is our Machine Learning expense forecasting. We train an ensemble of 220 decision trees in our Scikit-Learn RandomForestRegressor pipeline. But if a brand-new user has less than 6 months of data, SFT falls back to a **Least Squares Linear Regression model** using NumPy's `polyfit` trend-line fit. This guarantees that SFT provides statistically valid projections even during the cold-start phase."*

### Step 8: Retirement Planner & Stochastic Monte Carlo Simulation (3 Minutes)
*   **Action:** Click on **Retirement Planner** in the sidebar. Show the form parameters (Current Savings, Monthly Savings, Retirement Age, Target Goal). 
*   **Action:** Click **Calculate & Simulate**. Point to the resulting charts showing the deterministic projection path and the Monte Carlo distribution.
*   **Action:** Scroll down and highlight the **AI Advisor** panel, showing personalized recommendations based on the simulation results.
*   **Technical Defense Wording:** *"Here is SFT's Retirement Planner. Instead of utilizing flat, static annual rate-of-return assumptions, I engineered a hybrid forecasting and simulation engine. It pulls monthly income and expense projections directly from the Flask ML microservice (falling back to history-based least-squares heuristics if needed). 

    To model real-world market uncertainty and lifestyle variation, it executes a **stochastic Monte Carlo simulation of 1,000 runs**. In each run, for each year, returns are randomly sampled using the **Box-Muller Transform** to generate a true normal distribution, while annual income and expenses undergo uniform random variance. This computes a highly robust **Probability of Success** and maps optimistic, median, and pessimistic outcomes (10th/50th/90th percentiles). Finally, these simulated metrics are fed to the **Groq Llama-3 API** to output personalized, actionable recommendations for asset allocation and saving habits."*

---

## 💬 PART 3: Centralized Technical Q&A Defense Directory

These are direct, academic responses to the exact questions and computer science topics expected by the Plymouth / NSBM viva panel:

### 1. "Why did you choose the MERN stack instead of standard relational databases and a Django framework?"
*   **Answer:** *"MERN offers a single-language (JavaScript/TypeScript) environment across the entire stack. This simplifies development, serialization, and schema validation from front to back. In a high-frequency financial tracking system, dashboards require complex, varying data structures (e.g., dynamic context in AI chats, varying budget periods). Relational SQL databases would require excessively complex table joins or dynamic schema migrations that degrade performance. MongoDB’s document model stores these nested arrays natively, optimizing database read performance."*

### 2. "How did you validate email addresses in your system?"
*   **Answer:** *"We enforce a two-tier email verification system:
    1.  **Format Validation:** We apply a strict regular expression validator on the frontend inputs and inside our backend Mongoose `User` schema (`match: [/.+\@.+\..+/, 'Please fill a valid email address']`).
    2.  **Identity Verification:** During registration, and specifically when making secure P2P transfers, we dispatch a cryptographically secure 6-digit One-Time Password (OTP) to the user's email via Nodemailer. Only by entering the correct, active OTP can the user complete high-risk actions, proving ownership of the email account."*

### 3. "How did you test your system? Are your testing results 100% accurate?"
*   **Answer:** *"SFT is thoroughly verified across three distinct testing scopes:
    1.  **Unit & Integration Tests (Jest):** Implemented on the backend under `backend/controllers/__tests__/`. We use Jest mocks to mock Mongoose models, validating goal contributions, registration processes, and transaction CRUD operations without polluting our production database.
    2.  **Utility Tests (Vitest):** Implemented on the frontend under `frontend/src/utils/__tests__/` to test our currency formatting, date transformations, and API request helper functions with ultra-fast ESM execution speeds.
    3.  **End-to-End Tests (Playwright):** We use Playwright to simulate actual browser sessions, verifying user sign-ups, login state retention, and wallet money transfers, ensuring 100% transaction accuracy before deployment."*

### 4. "How did you implement Model-View-Controller (MVC) in SFT?"
*   **Answer:** *"SFT is structured using an MVC-Lite pattern to ensure high separation of concerns:
    *   **Model (M):** Defined inside our Mongoose schemas under `backend/models/` (e.g., `User.js`, `Wallet.js`, `LedgerEntry.js`), enforcing strict database structures and validations.
    *   **View (V):** Our React 19 single-page application acts as the client-side View, rendering SVG charts via Recharts and managing local component state.
    *   **Controller (C):** Express router endpoints map HTTP paths to standalone controllers (e.g., `transferController.js`, `budgetController.js`). To keep controllers lightweight, complex logic (like ML predictions or Groq prompts) is separated into a dedicated **Services layer** (e.g., `groq.service.js`, `financialHealthService.js`)."*

### 5. "What value does your system provide? Is this practical?"
*   **Answer:** *"SFT solves a documented psychological problem: the cognitive detachment from money caused by card payments. While automated apps make tracking too passive, and complex spreadsheets cause user fatigue, SFT balances both worlds: it forces mindful manual entry for active behavioral tracking but rewards users with advanced, gamified financial health scores, automated wallet security, and predictive ML spending forecasting. It is highly practical because it directly targets the user's spending habits at a behavioral level."*

### 6. "How did you manage code history? What is your branching strategy?"
*   **Answer:** *"I implemented the standard **Git Flow** branching methodology in our GitHub repository to ensure codebase stability:
    *   `main`: Holds the stable production-ready code.
    *   `develop`: Acts as the integration branch for current developments.
    *   `feature/*` and `bugfix/*`: Separate branches created for specific features (like `feature/p2p-wallet` or `bugfix/admin-sync`). Merges into `develop` are performed strictly via reviewed pull requests only after unit test suites pass, preventing production regressions."*

### 7. "What is the technical and mathematical logic behind SFT's Retirement Planner?"
*   **Answer:** *"SFT's Retirement Planner is an analytical forecasting and simulation pipeline running on our Node.js server (`retirement.service.js` & `retirement.simulation.js`) and integrated with the Python Flask ML service. It executes in four distinct phases:
    1.  **Multi-Source Future Forecasting:** SFT retrieves monthly spending and income projections over the planning horizon. By default, it queries the Python Flask ML service running a Scikit-Learn `RandomForestRegressor` (with 220 estimators). If the ML microservice is offline or in a cold-start phase (e.g., user history is < 6 months), the system falls back to a locally-computed **Least Squares Linear Regression** (fitting a first-order polynomial using historical data) adjusted by a **Seasonality Index** (monthly ratios relative to the overall baseline).
    2.  **Deterministic Projection:** These monthly projections are aggregated into annual totals. SFT models the horizon year-by-year. If advanced growth adjustments are enabled, income is compounded by the user's `salaryGrowthRate` and expenses by the `inflationRate`. The net contribution is computed as: `AnnualContribution = (MonthlySavings * 12) + (CompoundedIncome - CompoundedExpenses)`. The ending balance for year $t$ is calculated deterministically as: $Balance_t = (Balance_{t-1} + AnnualContribution) \times (1 + r_{return\_rate})$.
    3.  **Stochastic Monte Carlo Simulation:** To model real-world market volatility and lifestyle variance, SFT runs 1,000 simulations. For each year in a simulated run, the annual return rate is randomly generated using the **Box-Muller Transform** to create a normal distribution around the mean return rate and standard deviation parameters:
        $$Z = \sqrt{-2 \ln(U_1)} \cos(2\pi U_2) \quad \text{where } U_1, U_2 \sim \text{Uniform}(0, 1)$$
        $$r_{year} = \mu_{return} + Z \cdot \sigma_{std\_dev}$$
        Simultaneously, annual income and expenses are randomized using a uniform distribution within configurable variation bounds (e.g., income $\pm 10\%$, expenses $\pm 8\%$). SFT tracks how many runs exceed the user's target amount to calculate the **Probability of Success**, and sorts ending balances to determine the 10th percentile (pessimistic), 50th percentile (median), and 90th percentile (optimistic) financial outcomes.
    4.  **AI-Powered Strategic Advisor:** Finally, SFT packages the simulation metrics (ending balances, success probabilities, percentiles) and submits a context-rich prompt to the **Groq Llama-3 API**. The LLM processes these numbers and generates tailored, natural-language savings and asset reallocation recommendations."*

---

## 📈 PART 4: Quick-Reference Wording for Slides & Demo

Keep these punchy explanations ready for when you present your poster or slides:

*   **Project Area:** Personal FinTech & Behavioral Economics.
*   **Aim:** To design a cognitive-engagement-first financial system that uses machine learning and context-aware natural language processing to restore user financial mindfulness.
*   **Scope:** In-Scope includes manual transaction logging, P2P wallet transfers, Random Forest forecasts, budget alerts, and Tracksy AI. Out-of-Scope includes real-world bank syncing (which defeats the manual cognitive logging goal) and credit card payment processors (Stripe/PayPal), keeping our project isolated to secure, simulated internal ledgers.
*   **Challenges & Limitations:** Admin latency was solved via React Query background polling; Twilio SMS failures were solved using automatic Nodemailer email fallbacks.
*   **Future Enhancements:** receipt OCR scanning to speed up manual entries and moving to React Native for a cross-platform mobile experience.
