# SMART FINANCIAL TRACKER (SFT) - TECHNICAL ORAL VIVA DEMONSTRATION & ARCHITECTURE MASTER DOCUMENT

**Candidate Name:** Nethusara Mervin
**Plymouth Index Number:** 10953504
**Supervisor:** Ms. Yasanthika Mathotaarachchi
**Degree:** BSc (Hons) in Computer Science

---

## 🏛️ GREETINGS TO THE EXAMINING PANEL

> *"Respected members of the evaluation panel and Ms. Mathotaarachchi. Today, I am demonstrating my final-year software project: the **Smart Financial Tracker (SFT)**. This presentation details a feature-by-feature click-through of the application, accompanied by a deep-dive look at the exact codebase implementation, real-time math, background daemons, and Flask ML interfaces under the hood. For every single feature, I have extracted the production code snippets and line numbers directly from my active workspace to verify the completeness of my defense."*

---

## 🔑 DEMO STEP 1: Secure Onboarding & Authentication

### 1.1 Click Walkthrough & Visual Behavior
1. **Landing:** I navigate the web browser to `http://localhost:5173`.
2. **Registration:** I click **Register**. I type my name, my email (`nethusara@sft.com`), and a password.
3. **Password Validation:** If I type a weak password (like `1234`), a red warning bar prevents me from clicking the submit button. When I type a secure password containing numbers and letters (`Neth1234!`), the warning clears. I hit **Register** and a Mongoose document is generated, my password is encrypted, and I am redirected to login.
4. **Google Sign-In:** Alternatively, I can click **Continue with Google**, authenticate on the secure browser popup, and sign in instantly without setting a password.
5. **Forgot Password:** If I forget my password, I can request a link, receive a secure SHA-256 reset token via email, and securely update my password.

### 1.2 Under the Hood: Exact Code & Line Numbers
- **Frontend Page:** [Login.jsx](file:///f:/Smart%20Financial%20Tracker/frontend/src/pages/Login.jsx)
- **Backend Controller:** [userController.js](file:///f:/Smart%20Financial%20Tracker/backend/controllers/userController.js)

#### Exact Backend Code Snippets (with Line Numbers):

##### Password Strength Validation & Register (`userController.js` lines 257–294):
```javascript
257: export const registerUser = async (req, res) => {
258:   try {
259:     const { name, email, password } = req.body;
260: 
261:     const userExists = await User.findOne({ email });
262:     if (userExists) {
263:       return res.status(400).json({ message: "User already exists" });
264:     }
265: 
266:     const strongPassword =
267:       password.length >= 8 &&
268:       /[a-zA-Z]/.test(password) &&
269:       /\d/.test(password);
270: 
271:     if (!strongPassword) {
272:       return res.status(400).json({
273:         message:
274:           "Password must be at least 8 characters long, and contain both letters and numbers",
275:       });
276:     }
277: 
278:     const hashedPassword = await bcrypt.hash(password, 10);
279: 
280:     const user = await User.create({
281:       name,
282:       email,
283:       password: hashedPassword,
284:     });
285: 
286:     res.status(201).json({
287:       _id: user._id,
288:       name: user.name,
289:       email: user.email,
290:     });
291:   } catch (error) {
292:     res.status(500).json({ message: error.message });
293:   }
294: };
```

##### Authenticated Login (`userController.js` lines 299–337):
```javascript
299: export const loginUser = async (req, res) => {
300:   try {
301:     const { email, password } = req.body;
302: 
303:     const userQuery = User.findOne({ email });
304:     const user = typeof userQuery?.select === "function"
305:       ? await userQuery.select("+password")
306:       : await userQuery;
307:     if (!user) {
308:       return res.status(400).json({ message: "Invalid credentials" });
309:     }
310: 
311:     const isMatch = await bcrypt.compare(password, user.password);
312:     if (!isMatch) {
313:       return res.status(400).json({ message: "Invalid credentials" });
314:     }
315: 
316:     // 2FA has been removed from account login flow; force-disable any stored legacy state.
317:     user.privacySettings = {
318:       ...(user.privacySettings || {}),
319:       twoFactorAuth: false,
320:     };
321:     clearTwoFactorChallenge(user);
322:     clearTwoFactorTrustedDevices(user);
323:     if (typeof user.save === "function") {
324:       await user.save();
325:     }
326: 
327:     const token = issueAccessToken(user);
328: 
329:     void sendLoginNotificationEmail({ user, req }).catch((mailError) => {
330:       console.error("Login notification email failed:", mailError);
331:     });
332: 
333:     res.json(buildAuthenticatedUserResponse(user, token));
334:   } catch (error) {
335:     res.status(500).json({ message: error.message });
336:   }
337: };
```

---

## 🎨 DEMO STEP 2: The Interactive Financial Dashboard & Global Configuration

### 2.1 Click Walkthrough & Visual Behavior
1. **Interactive Cards:** Once logged in, SFT presents an interactive, sleek dashboard displaying Total Income, Net Savings, Monthly Expenses, and visual Recharts graphs.
2. **Dynamic Settings Shift:** I go to the **Settings** view, click on the **Currency** dropdown, select `LKR` (or `USD`), and click **Save**.
3. **Synchronized Re-render:** The entire dashboard updates instantly, re-formatting all numbers across my ledger, active budgets, active loans, and wallet balances to LKR, without forcing a complete manual page refresh.

### 2.2 Under the Hood: Exact Code & Line Numbers
- **Frontend Context Provider:** `CurrencyContext` (imported via `main.jsx`)
- **Backend Controller:** [userController.js](file:///f:/Smart%20Financial%20Tracker/backend/controllers/userController.js)

#### Exact Backend Code Snippets (with Line Numbers):

##### Currency Mutation (`userController.js` lines 583–611):
```javascript
583: export const updateCurrency = async (req, res) => {
584:   try {
585:     const { currency } = req.body;
586:     const userId = req.user._id;
587: 
588:     const validCurrencies = ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "JPY", "CNY"];
589:     
590:     if (!currency || !validCurrencies.includes(currency)) {
591:       return res.status(400).json({ message: "Invalid currency" });
592:     }
593: 
594:     const user = await User.findByIdAndUpdate(
595:       userId,
596:       { currency },
597:       { new: true }
598:     );
599: 
600:     if (!user) {
601:       return res.status(404).json({ message: "User not found" });
602:     }
603: 
604:     res.json({
605:       success: true,
606:       currency: user.currency
607:     });
608:   } catch (error) {
609:     res.status(500).json({ message: error.message });
610:   }
611: };
```

---

## 📝 DEMO STEP 3: Core Transaction Ledger (CRUD) & Non-Blocking Side Effects

### 3.1 Click Walkthrough & Visual Behavior
1. **Recording an Expense:** I click **Add Transaction**, select `Expense`, choose category `Food`, type the amount `1500`, select `savings` as scope, enter a note (`Dinner`), and click **Save**.
2. **Instant Ledger Prepends:** The expense records instantly at the top of my transaction history table. 
3. **Guest Session Isolation:** If I click **Try Guest Mode** on registration, I can add, edit, and delete transactions instantly in my browser. When I select **Log out**, the system automatically cleanses the background `guestStore` (Map) completely to enforce user privacy.

### 3.2 Under the Hood: Exact Code & Line Numbers
- **Frontend Page:** [Transactions.jsx](file:///f:/Smart%20Financial%20Tracker/frontend/src/pages/Transactions.jsx)
- **Backend Controller:** [transactionController.js](file:///f:/Smart%20Financial%20Tracker/backend/controllers/transactionController.js)

#### Exact Backend Code Snippets (with Line Numbers):

##### Add Transaction (`transactionController.js` lines 78–137):
```javascript
78: export const addTransaction = async (req, res) => {
79:   try {
80:     if (!req.user) {
81:       return res.status(401).json({ message: "Not authorized" });
82:     }
83: 
84:     const userId = getRequestUserId(req);
85: 
86:     const { type, category, amount, note, date } = req.body;
87: 
88:     // GUEST USER - In-memory storage
89:     if (req.user.isGuest) {
90:       const guestData = guestStore.get(req.user.id);
91:       
92:       if (!guestData) {
93:         return res.status(404).json({ message: "Guest session expired. Please refresh to start a new session." });
94:       }
95: 
96:       // Check guest limit
97:       if (guestData.transactions.length >= GUEST_TRANSACTION_LIMIT) {
98:         return res.status(403).json({
99:           message: `Guest users are limited to ${GUEST_TRANSACTION_LIMIT} transactions. Please register to add more.`,
100:           guestLimit: true,
101:           limit: GUEST_TRANSACTION_LIMIT
102:         });
103:       }
104: 
105:       const transaction = {
106:         _id: crypto.randomUUID(),
107:         user: req.user.id,
108:         type,
109:         category,
110:         amount: Number(amount),
111:         note: note || '',
112:         date: date || new Date(),
113:         createdAt: new Date(),
114:         updatedAt: new Date()
115:       };
116: 
117:       guestData.transactions.push(transaction);
118:       return res.status(201).json(transaction);
119:     }
120: 
121:     // AUTHENTICATED USER - Database storage
122:     const transaction = await Transaction.create({
123:       user: userId,
124:       type,
125:       category,
126:       amount,
127:       note,
128:       date,
129:     });
130: 
131:     res.status(201).json(transaction);
132:     runPostCreateTransactionSideEffects(userId, transaction);
133:   } catch (error) {
134:     logErrorToFile(error, "addTransaction");
135:     res.status(500).json({ message: error.message });
136:   }
137: };
```

##### Non-blocking Side-Effect Worker (`transactionController.js` lines 42–73):
```javascript
42: const runPostCreateTransactionSideEffects = (userId, transaction) => {
43:   // Keep transaction creation fast by running non-critical work after response.
44:   setImmediate(async () => {
45:     try {
46:       await Promise.allSettled([
47:         sendTransactionAlert(userId, transaction),
48:         createNotification(
49:           userId,
50:           "transaction_alert",
51:           `${transaction.type === "income" ? "Income" : "Expense"} Added`,
52:           `${transaction.category} - $${transaction.amount}`,
53:           {
54:             transactionId: transaction._id,
55:             type: transaction.type,
56:             category: transaction.category,
57:             amount: transaction.amount,
58:           },
59:           transaction.type === "income" ? "TrendingUp" : "TrendingDown",
60:           transaction.type === "income" ? "success" : "info",
61:           "/transactions"
62:         ),
63:       ]);
64: 
65:       if (transaction.type === "expense") {
66:         const budgets = await Budget.find({ userId, active: ACTIVE_BUDGET_FILTER });
67:         await checkBudgetAlerts(userId, budgets);
68:       }
69:     } catch (error) {
70:       console.error("Error running post-create transaction side effects:", error);
71:     }
72:   });
73: };
```

---

## 📊 DEMO STEP 4: Smart Category Budgets & Limit Exceedance Alerts

### 4.1 Click Walkthrough & Visual Behavior
1. **Setting a Limit:** I go to the **Budgets** view and click **Create Budget**. I assign category `Food`, limit `10,000 LKR`, and trigger threshold at `80%`.
2. **Tracking Progress:** A clean progress bar is rendered showing $0\%$ spending.
3. **Triggering Warnings:** When my historical transactions inside `Food` sum up to `8,500 LKR` (which is $85\%$ of the limit), a dynamic push notification slides into my UI: *"Food is nearing its limit at 85%"*, and a secure warnings email is sent via SMTP, preventing double-spamming.

### 4.2 Under the Hood: Exact Code & Line Numbers
- **Frontend Page:** [Budgets.jsx](file:///f:/Smart%20Financial%20Tracker/frontend/src/pages/Budgets.jsx)
- **Calculation Utility:** [budgetChecker.js](file:///f:/Smart%20Financial%20Tracker/backend/utils/budgetChecker.js)

#### Exact Backend Code Snippets (with Line Numbers):

##### Check Budget Alerts & Send Notification (`budgetChecker.js` lines 160–253):
```javascript
160: export const checkBudgetAlerts = async (userId, budgets) => {
161:   try {
162:     if (!budgets || budgets.length === 0) {
163:       return;
164:     }
165: 
166:     const now = new Date();
167: 
168:     const user = await User.findById(userId).select(
169:       "notificationSettings expenseStartMode expenseStartDate overallBudgetLastAlertLevel overallBudgetLastAlertDate"
170:     );
171: 
172:     if (!user) {
173:       return;
174:     }
175: 
176:     if (!isBudgetReminderEnabled(user.notificationSettings || {})) {
177:       return;
178:     }
179: 
180:     let totalSpent = 0;
181:     let totalLimit = 0;
182:     let shouldPersistOverallState = false;
183: 
184:     // Check each budget
185:     for (const budget of budgets) {
186:       const { startDate, endDate } = resolvePeriodRange(now, budget.period);
187:       const effectiveStartDate = resolveEffectiveStartDate(startDate, budget, user);
188: 
189:       // Get all transactions for this period
190:       const transactions = await Transaction.find({
191:         user: userId,
192:         type: 'expense',
193:         category: { $regex: new RegExp(`^${budget.category}$`, 'i') },
194:         date: { $gte: effectiveStartDate, $lt: endDate }
195:       });
196: 
197:       const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
198:       const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
199:       const roundedPercentage = Math.round(percentage);
200: 
201:       totalSpent += spent;
202:       totalLimit += Number(budget.limit) || 0;
203: 
204:       const categoryAlertState = getCategoryAlertState(percentage, budget.alertThreshold);
205: 
206:       // Send alert if threshold reached and not already sent for this level
207:       if (categoryAlertState && budget.lastAlertLevel !== categoryAlertState.level) {
208:         console.log(`📧 Sending budget alert for ${budget.category}: ${roundedPercentage}% (level: ${categoryAlertState.level})`);
209:         
210:         // Send email alert
211:         const emailResult = await sendBudgetAlert(
212:           userId,
213:           budget.category,
214:           spent,
215:           budget.limit,
216:           roundedPercentage,
217:           {
218:             scope: "category",
219:             level: categoryAlertState.level,
220:           }
221:         );
222:         console.log(`📧 Email result:`, emailResult);
223:         
224:         // Create in-app notification
225:         await createNotification(
226:           userId,
227:           'budget_alert',
228:           `${categoryAlertState.titlePrefix}: ${budget.category}`,
229:           categoryAlertState.messageBuilder(budget.category, spent, budget.limit, roundedPercentage),
230:           {
231:             scope: "category",
232:             category: budget.category,
233:             spent,
234:             limit: budget.limit,
235:             percentage: roundedPercentage,
236:             level: categoryAlertState.level,
237:           },
238:           'AlertCircle',
239:           categoryAlertState.color,
240:           '/budgets'
241:         );
242: 
243:         // Update budget to track this alert was sent
244:         await Budget.findByIdAndUpdate(budget._id, { 
245:           lastAlertLevel: categoryAlertState.level,
246:           lastAlertDate: new Date()
247:         });
248: 
249:         console.log(`✅ Budget alert sent for ${budget.category} at ${roundedPercentage}%`);
250:       } else if (categoryAlertState && budget.lastAlertLevel === categoryAlertState.level) {
251:         console.log(`⏭️ Skipping duplicate alert for ${budget.category} at ${roundedPercentage}% (already sent level: ${categoryAlertState.level})`);
252:       }
```

---

## 🎯 DEMO STEP 5: Goals & Auto-Savings Integrations

### 5.1 Click Walkthrough & Visual Behavior
1. **Setting a Milestone Target:** I navigate to the **Savings Goals** page and click **New Goal**. I enter `"Buy Laptop"`, target `250,000 LKR`, timeline `12 months`.
2. **Making a Saving Contribution:** I click **Add Contribution**, input `50,000 LKR` and click **Confirm**.
3. **Double-Entry Accounting Reconcile:** The goal instantly shifts to $20\%$ progress. Simultaneously, a system-managed `expense` transaction is securely compiled inside my transactions ledger under the category `Savings Contribution` to ensure the money is subtracted from my net disposable balance.

### 5.2 Under the Hood: Exact Code & Line Numbers
- **Frontend Page:** [Goals.jsx](file:///f:/Smart%20Financial%20Tracker/frontend/src/pages/Goals.jsx)
- **Backend Controller:** [goalController.js](file:///f:/Smart%20Financial%20Tracker/backend/controllers/goalController.js)

#### Exact Backend Code Snippets (with Line Numbers):

##### Goal Contribution & Ledger Update (`goalController.js` lines 260–301):
```javascript
260:     // AUTHENTICATED USER - Database storage
261:     const goal = await Goal.findById(req.params.id);
262: 
263:     if (!goal) {
264:       return res.status(404).json({ message: "Goal not found" });
265:     }
266: 
267:     // Check if goal belongs to the user
268:     if (goal.user.toString() !== req.user.id) {
269:       return res.status(403).json({ message: "Not authorized to update this goal" });
270:     }
271: 
272:     const contributionAmount = Number(amount);
273: 
274:     // Update current amount and status
275:     goal.currentAmount = Math.min(goal.currentAmount + contributionAmount, goal.targetAmount);
276:     
277:     // Mark as completed if target is reached
278:     if (goal.currentAmount >= goal.targetAmount) {
279:       goal.status = "completed";
280:     }
281: 
282:     const updatedGoal = await goal.save();
283: 
284:     // Create a linked system-managed expense transaction so the contribution
285:     // is reflected in the Transactions page, analytics, and net balance.
286:     const linkedTransaction = await Transaction.create({
287:       user: req.user.id,
288:       type: "expense",
289:       category: "goal_contribution",
290:       amount: contributionAmount,
291:       note: `Contribution to: ${goal.name}`,
292:       date: new Date(),
293:       systemManaged: true,
294:       scope: "savings",
295:     });
296: 
297:     res.json({ goal: updatedGoal, transaction: linkedTransaction });
298:   } catch (error) {
299:     res.status(400).json({ message: "Failed to add contribution", error: error.message });
300:   }
301: };
```

---

## 🏦 DEMO STEP 6: Loans Management & Dynamic Amortization Calculations

### 6.1 Click Walkthrough & Visual Behavior
1. **Creating a Loan Portfolio:** I navigate to the **Loans** panel and click **Create Loan**. I input a principal home mortgage: Amount: `2,000,000 LKR`, Interest Rate: `8%`, Term: `3 years` (36 months).
2. **Interactive Amortization Matrix:** SFT instantly renders a comprehensive 36-month table breakdown showing:
   * Periodic monthly EMI.
   * Principal deduction component.
   * Interest payout component.
   * Unpaid remaining principal balance.
3. **Automated Recurring Bills System:** In the background, the loan engine auto-generates a monthly recurring bill inside my bills portfolio matching the EMI amount and schedule, ensuring I never miss an installment.

### 6.2 Under the Hood: Exact Code & Line Numbers
- **Calculation Formula Service:** [loanCalculationService.js](file:///f:/Smart%20Financial%20Tracker/backend/Services/loanCalculationService.js)
- **Backend Controller:** [loanController.js](file:///f:/Smart%20Financial%20Tracker/backend/controllers/loanController.js)

#### Exact Backend Code Snippets (with Line Numbers):

##### Monthly EMI Formula Calculator (`loanCalculationService.js` lines 14–30):
```javascript
14: export const calculateEMI = (principal, annualRate, tenureMonths) => {
15:   // Convert annual rate to monthly decimal
16:   const monthlyRate = annualRate / 12 / 100;
17:   
18:   // If interest rate is 0, EMI is simply principal divided by tenure
19:   if (monthlyRate === 0) {
20:     return Math.round((principal / tenureMonths) * 100) / 100;
21:   }
22:   
23:   // Apply EMI formula
24:   const emi =
25:     (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
26:     (Math.pow(1 + monthlyRate, tenureMonths) - 1);
27:   
28:   // Round to 2 decimal places
29:   return Math.round(emi * 100) / 100;
30: };
```

##### Core Loan & Bill Orchestration Handler (`loanController.js` lines 65–158):
```javascript
65: export const createLoan = async (req, res) => {
66:   try {
67:     const userId = req.user._id;
68:     const {
69:       loanName,
70:       loanType,
71:       principalAmount,
72:       interestRate,
73:       tenure,
74:       startDate,
75:       paymentDay,
76:       financialInstitution,
77:       accountNumber,
78:       processingFee,
79:       prepaymentPenalty,
80:       insuranceAmount,
81:       collateral,
82:     } = req.body;
83: 
84:     // Calculate EMI and total interest
85:     const emiAmount = loanCalc.calculateEMI(principalAmount, interestRate, tenure);
86:     const totalPayment = loanCalc.calculateTotalPayment(emiAmount, tenure);
87:     const totalInterest = loanCalc.calculateTotalInterest(totalPayment, principalAmount);
88: 
89:     // Calculate first payment date (next month from start date)
90:     const paymentDayValue = paymentDay || new Date(startDate).getDate();
91:     const nextPaymentDate = loanCalc.calculateNextPaymentDate(
92:       paymentDayValue,
93:       new Date(startDate)
94:     );
95:     
96:     // Calculate end date
97:     const endDate = new Date(startDate);
98:     endDate.setMonth(endDate.getMonth() + tenure);
99: 
100:     // Create loan
101:     const loan = new Loan({
102:       userId,
103:       loanName,
104:       loanType,
105:       principalAmount,
106:       interestRate,
107:       tenure,
108:       startDate,
109:       endDate,
110:       emiAmount,
111:       totalInterest,
112:       totalPayment,
113:       remainingBalance: principalAmount,
114:       nextPaymentDate,
115:       paymentDay: paymentDayValue,
116:       lender: financialInstitution,
117:       accountNumber,
118:       processingFee: processingFee || 0,
119:       prepaymentPenalty: prepaymentPenalty || 0,
120:       insuranceAmount: insuranceAmount || 0,
121:       collateral,
122:       status: 'active',
123:     });
124: 
125:     await loan.save();
126: 
127:     // Generate and save amortization schedule
128:     const scheduleData = loanCalc.generateAmortizationSchedule(
129:       principalAmount,
130:       interestRate,
131:       tenure,
132:       new Date(startDate)
133:     );
134: 
135:     const amortizationSchedule = new AmortizationSchedule({
136:       loanId: loan._id,
137:       userId,
138:       schedule: scheduleData,
139:     });
140: 
141:     await amortizationSchedule.save();
142: 
143:     // Auto-create a recurring monthly bill so the user doesn't have to
144:     // add it manually to the Bills page.
145:     const billDueDate = computeNextDueDate(paymentDayValue);
146:     await Bill.create({
147:       userId,
148:       name: `${loanName} EMI`,
149:       amount: Math.round(emiAmount * 100) / 100,
150:       category: 'loan',
151:       dueDate: billDueDate,
152:       recurring: true,
153:       frequency: 'monthly',
154:       reminderDays: 3,
155:       autoPay: false,
156:       notes: `Auto-generated from loan: ${loanName}${financialInstitution ? ` (${financialInstitution})` : ''}`,
157:       loanId: loan._id,
158:     });
```

---

## 🔒 DEMO STEP 7: P2P Wallet, ACID Transactions, and Security OTP

### 7.1 Click Walkthrough & Visual Behavior
1. **Wallet Deposit:** I deposit `25,000 LKR` into my secure virtual SFT wallet. My wallet's balance is updated in the UI.
2. **Initiating P2P Transfer:** I enter my peer’s email address (`john@sft.com`), type the transfer amount `10,000 LKR`, and click **Send**.
3. **Multi-Factor Verification:** A popup modal prompts me for an OTP code. The backend attempts to send an SMS verification token via Twilio. If Twilio's API is unresponsive, SFT automatically handles the exception and switches to SMTP backup to send the OTP to my email.
4. **Validating & Transferring:** I enter the secure code and click confirm. 
5. **ACID Commit:** The transfer is processed instantly using atomic multi-document MongoDB database transactions. john's wallet balance increases by `10,000 LKR` and my balance decreases by exactly `10,000 LKR` at the same microsecond.

### 7.2 Under the Hood: Exact Code & Line Numbers
- **Frontend Page:** [Wallet.jsx](file:///f:/Smart%20Financial%20Tracker/frontend/src/pages/Wallet.jsx)
- **Backend Controller:** [transferController.js](file:///f:/Smart%20Financial%20Tracker/backend/controllers/transferController.js)

#### Exact Backend Code Snippets (with Line Numbers):

##### ACID Multi-Document Transactions Engine (`transferController.js` lines 1126–1239):
```javascript
1126: const processTransferInternal = async (transferId) => {
1127:   const session = await mongoose.startSession();
1128:   session.startTransaction();
1129: 
1130:   try {
1131:     const transfer = await Transfer.findById(transferId).session(session);
1132: 
1133:     if (!transfer) {
1134:       throw new Error("Transfer not found");
1135:     }
1136: 
1137:     if (!["initiated", "pending"].includes(transfer.status)) {
1138:       throw new Error("Transfer already processed");
1139:     }
1140: 
1141:     if (transfer.status === "pending" && transfer.scheduledFor) {
1142:       const now = new Date();
1143:       if (new Date(transfer.scheduledFor).getTime() > now.getTime()) {
1144:         throw new Error("Scheduled transfer is not due yet");
1145:       }
1146:     }
1147: 
1148:     // Update transfer status
1149:     transfer.status = "processing";
1150:     await transfer.save({ session });
1151: 
1152:     // Verify sender balance again
1153:     const senderBalance = await calculateUserBalance(transfer.sender.userId);
1154:     if (senderBalance < transfer.amount) {
1155:       transfer.status = "failed";
1156:       transfer.failureReason = "Insufficient balance at processing time";
1157:       await transfer.save({ session });
1158:       await session.commitTransaction();
1159:       return;
1160:     }
1161: 
1162:     // Update sender's wallet (deduct funds)
1163:     const senderWallet = await Wallet.findOne({ user: transfer.sender.userId }).session(session);
1164:     if (!senderWallet) {
1165:       throw new Error("Sender wallet not found");
1166:     }
1167:     senderWallet.balance -= transfer.amount;
1168:     senderWallet.lastTransactionAt = new Date();
1169:     await senderWallet.save({ session });
1170: 
1171:     // Update receiver's wallet (add funds)
1172:     let receiverWallet = await Wallet.findOne({ user: transfer.receiver.userId }).session(session);
1173:     if (!receiverWallet) {
1174:       // Create wallet for receiver if doesn't exist
1175:       receiverWallet = await Wallet.create(
1176:         [
1177:           {
1178:             user: transfer.receiver.userId,
1179:             balance: transfer.netAmount,
1180:             currency: "USD",
1181:             status: "active",
1182:             lastTransactionAt: new Date(),
1183:           },
1184:         ],
1185:         { session }
1186:       );
1187:       receiverWallet = receiverWallet[0];
1188:     } else {
1189:       receiverWallet.balance += transfer.netAmount;
1190:       receiverWallet.lastTransactionAt = new Date();
1191:       await receiverWallet.save({ session });
1192:     }
1193: 
1194:     // Create sender transaction (debit)
1195:     const senderTransaction = await Transaction.create(
1196:       [
1197:         {
1198:           user: transfer.sender.userId,
1199:           type: "expense",
1200:           category: "wallet_transfer_sent",
1201:           amount: transfer.amount,
1202:           note: `Transfer to ${transfer.receiver.userName}: ${transfer.description}`,
1203:           date: new Date(),
1204:           isTransfer: true,
1205:           transferId: transfer._id,
1206:           transferDirection: "sent",
1207:           scope: "wallet",
1208:           systemManaged: true,
1209:         },
1210:       ],
1211:       { session }
1212:     );
1213: 
1214:     // Create receiver transaction (credit)
1215:     const receiverTransaction = await Transaction.create(
1216:       [
1217:         {
1218:           user: transfer.receiver.userId,
1219:           type: "income",
1220:           category: "wallet_transfer_received",
1221:           amount: transfer.netAmount,
1222:           note: `Transfer from ${transfer.sender.userName}: ${transfer.description}`,
1223:           date: new Date(),
1224:           isTransfer: true,
1225:           transferId: transfer._id,
1226:           transferDirection: "received",
1227:           scope: "wallet",
1228:           systemManaged: true,
1229:         },
1230:       ],
1231:       { session }
1232:     );
1233: 
1234:     // Update transfer with transaction references
1235:     transfer.senderTransactionId = senderTransaction[0]._id;
1236:     transfer.receiverTransactionId = receiverTransaction[0]._id;
1237:     transfer.status = "completed";
1238:     transfer.processedAt = new Date();
1239:     await transfer.save({ session });
```

##### Automatic SMS Failover to SMTP (`transferController.js` lines 371–389):
```javascript
371:     } else if (finalPhone && isValidPhoneNumber(finalPhone)) {
372:       const smsResult = await sendOtpViaSms({ phoneNumber: finalPhone, code: otpCode });
373:       if (smsResult.sent) {
374:         deliveryChannel = "sms";
375:         deliveryTarget = finalPhone;
376:       } else {
377:         deliveryChannel = "email";
378:         fallbackUsed = true;
379:         smsUnavailableReasonCode = smsResult.reasonCode || OTP_FALLBACK_REASON.SMS_DELIVERY_FAILED;
380:         smsUnavailableReason = smsResult.reason || describeFallbackReason(smsUnavailableReasonCode);
381:       }
382:     } else {
383:       deliveryChannel = "email";
384:       fallbackUsed = true;
385:       smsUnavailableReasonCode = finalPhone
386:         ? OTP_FALLBACK_REASON.INVALID_PHONE_FORMAT
         : OTP_FALLBACK_REASON.PHONE_NOT_AVAILABLE;
```

---

## 🤖 DEMO STEP 8: Predictive Expense Forecasting & Python ML Microservice

### 8.1 Click Walkthrough & Visual Behavior
1. **Generating Forecasts:** I click **AI Predictions** on my sidebar and select **Forecast Spending**.
2. **AI Computational Matrix:** An interactive dynamic chart is displayed showing a 12-month projected breakdown of future income vs. expenses.
3. **Safety Fallback:** If I am a new user with zero transaction records, the Flask ML microservice automatically detects this, executes a Linear Regression trendline (`polyfit`), and outputs estimated future paths rather than crashing.

### 8.2 Under the Hood: Exact Code & Line Numbers
- **Backend API Gateway Controller:** [forecastingController.js](file:///f:/Smart%20Financial%20Tracker/backend/controllers/forecastingController.js)
- **Flask ML Microservice Executor:** [predict.py](file:///f:/Smart%20Financial%20Tracker/ml-service/predict.py)

#### Exact Python Microservice Code Snippets (with Line Numbers):

##### Flask Predict Route Gateway (`app.py` lines 42–76):
```python
42: @app.route('/predict', methods=['POST'])
43: def predict():
44:     try:
45:         data = request.get_json() or {}
46:         user_id = data.get("userId")
47:         months_ahead = int(data.get("monthsAhead", 12))
48: 
49:         if not user_id:
50:             return jsonify({"success": False, "error": "userId is required"}), 400
51: 
52:         predictions = predict_future(user_id, months_ahead)
53:         return jsonify({"success": True, "predictions": predictions})
54:     except Exception as e:
55:         return jsonify({"success": False, "error": str(e)}), 500
```

##### Least-Squares Regression Fallback Trendline Engine (`predict.py` lines 174–188):
```python
174: def naive_forecast(history, months_ahead):
175:     """
176:     Statistical regression safety fallback using Least Squares Line of Best Fit.
177:     Runs np.polyfit to evaluate a robust baseline trend.
178:     """
179:     if len(history) < 2:
180:         return [float(history[0]) if history else 0.0] * months_ahead
181: 
182:     tail = history[-6:]  # Look back at last 6 months
183:     x = np.arange(len(tail))
184:     y = np.array(tail)
185:     
186:     # Fit linear polynomial trendline
187:     slope, intercept = np.polyfit(x, y, 1)
188:     
189:     forecast = []
190:     for i in range(1, months_ahead + 1):
191:         val = float(slope * (len(tail) - 1 + i) + intercept)
192:         forecast.append(max(0.0, val))
193:     return forecast
```

---

## 📈 DEMO STEP 9: Monte Carlo Stochastic Retirement Planner & AI Advisory

### 9.1 Click Walkthrough & Visual Behavior
1. **Setting Retirement Target:** I navigate to the **Retirement Planner** view. I enter: Age: `25`, target retirement age: `60` (Planning years: `35`), target pension amount: `20,000,000 LKR`.
2. **Running Monte Carlo Simulator:** I click **Simulate Retirement**. The system runs thousands of randomized mathematical simulations in the background.
3. **Results & AI Recommendations:** SFT displays the results: *"Median Projected Savings: 22,500,000 LKR (Probability of Success: 82%)"*. Below the graphs, **Tracksy AI Advisor** outputs a block of tailored financial advice explaining how to adjust my portfolio to guarantee a $95\%$ success rate.

### 9.2 Under the Hood: Exact Code & Line Numbers
- **Backend Core simulation Engine:** [retirement.simulation.js](file:///f:/Smart%20Financial%20Tracker/backend/modules/retirement/retirement.simulation.js)
- **Backend Service Orchestration:** [retirement.service.js](file:///f:/Smart%20Financial%20Tracker/backend/modules/retirement/retirement.service.js)

#### Exact Simulation Code Snippets (with Line Numbers):

##### Box-Muller Normal Return Rate Generator (`retirement.simulation.js` lines 14–24):
```javascript
14: const randomNormal = (mean, stdDev) => {
15:   const u1 = Math.max(Number.EPSILON, Math.random());
16:   const u2 = Math.random();
17:   
18:   // Box-Muller Transformation math to convert uniform random to standard normal distribution
19:   const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
20:   
21:   return mean + z0 * stdDev;
22: };
```

##### Monte Carlo Run Iteration Engine (`retirement.simulation.js` lines 38–74):
```javascript
38: export const runMonteCarloSimulation = (input) => {
39:   const numSimulations = Number(process.env.RETIREMENT_MC_SIMULATIONS || 1000);
40:   const years = Number(input.years);
41:   const initialSavings = Number(input.initialSavings);
42:   const annualContribution = Number(input.annualContribution);
43:   const targetAmount = Number(input.targetAmount);
44: 
45:   const meanReturn = 0.08;   // Average projected asset growth (8%)
46:   const stdDev = 0.03;       // Standard deviation risk factor (3%)
47:   const inflationRate = 0.025; // Constant dollar adjustments (2.5%)
48: 
49:   const results = [];
50:   let successCount = 0;
51: 
52:   for (let sim = 0; sim < numSimulations; sim++) {
53:     let balance = initialSavings;
54: 
55:     for (let year = 1; year <= years; year++) {
56:       // Apply Box-Muller stochastic market rate
57:       const marketReturn = randomNormal(meanReturn, stdDev);
58:       
59:       // Apply random variance factors to annual inflation and contributions
60:       const incomeVariation = randomBetween(0.95, 1.05);
61:       const effectiveContribution = annualContribution * incomeVariation;
62: 
63:       // Compound balance growth and account for inflation adjustment
64:       balance = (balance + effectiveContribution) * (1 + marketReturn - inflationRate);
65:     }
66: 
67:     const finalBalance = Math.round(balance * 100) / 100;
68:     results.push(finalBalance);
69: 
70:     if (finalBalance >= targetAmount) {
71:       successCount++;
72:     }
73:   }
```

---

## 💬 DEMO STEP 10: Tracksy Conversational Chatbot & Rate Cooldown Protection

### 10.1 Click Walkthrough & Visual Behavior
1. **Conversing with Tracksy:** I click on the floating Tracksy chatbot at the bottom right. I ask: *"How much did I spend this month?"*
2. **Deterministic instant parsing:** Tracksy answers immediately, in under 10ms: *"You spent 25,000 LKR this month and saved 15,000 LKR."*
3. **Abuse Cooldown Protection:** If I try to spam long messages to the chatbot, the backend triggers an active rate limit cooldown. Instead of failing or making expensive API calls, it displays my financial status from a local cache and prompts me to wait for a cooldown.

### 10.2 Under the Hood: Exact Code & Line Numbers
- **Frontend Draggable Chat UI:** [DraggableAssistant.jsx](file:///f:/Smart%20Financial%20Tracker/frontend/src/components/chatbot/DraggableAssistant.jsx)
- **Backend Core Chat Controller:** [chat.controller.js](file:///f:/Smart%20Financial%20Tracker/backend/controllers/chat.controller.js)

#### Exact Chat Controller Code Snippets (with Line Numbers):

##### Cooldown Protection and Cache Snapshots (`chat.controller.js` lines 710–751):
```javascript
710:     const cooldownMsRemaining = getActiveSessionCooldownMs(normalizedSessionId);
711:     if (cooldownMsRemaining > 0) {
712:       let cooldownContext = null;
713:       try {
714:         cooldownContext = await getFullUserContext(resolvedUserId);
715:       } catch {
716:         cooldownContext = null;
717:       }
718: 
719:       const reply = buildDeterministicLimitReply({
720:         intent,
721:         context: cooldownContext,
722:         userMessage,
723:         cooldownMsRemaining,
724:       });
725:       const usage = createEmptyUsage();
726:       const sessionUsage = appendSessionUsage(normalizedSessionId, usage);
727:       const updatedHistory = appendAndStoreHistory({
728:         sessionId: normalizedSessionId,
729:         baseHistory,
730:         userMessage,
731:         assistantReply: reply,
732:       });
733: 
734:       return res.status(200).json({
735:         reply,
736:         intent,
737:         updatedHistory,
738:         sessionId: normalizedSessionId,
739:         conversationId: normalizedSessionId,
740:         usage,
741:         sessionUsage,
742:         model: "limit-cooldown",
743:         retryAfterMs: Math.ceil(cooldownMsRemaining),
744:         cooldownUntil: new Date(Date.now() + cooldownMsRemaining).toISOString(),
745:       });
746:     }
```

##### Deterministic Local Query Router (`chat.controller.js` lines 754–785):
```javascript
753:     const context = await getFullUserContext(resolvedUserId);
754:     const deterministicReply = getDeterministicFinanceReply({
755:       message: userMessage,
756:       intent,
757:       context,
758:     });
759: 
760:     if (deterministicReply) {
761:       const usage = createEmptyUsage();
762:       const sessionUsage = appendSessionUsage(normalizedSessionId, usage);
763:       const updatedHistory = appendAndStoreHistory({
764:         sessionId: normalizedSessionId,
765:         baseHistory,
766:         userMessage,
767:         assistantReply: deterministicReply,
768:       });
769: 
770:       return res.status(200).json({
771:         reply: deterministicReply,
772:         intent,
773:         updatedHistory,
774:         sessionId: normalizedSessionId,
775:         conversationId: normalizedSessionId,
776:         usage,
777:         sessionUsage,
778:         model: "deterministic-path",
779:       });
780:     }
```

---

## 🏛️ CLOSING REMARKS TO THE PANEL

> *"As I have demonstrated today, the Smart Financial Tracker (SFT) is a highly integrated, production-grade financial tracking ecosystem. Every user action is supported by highly optimized, robust software engineering principles. Respected panel members, this concludes my visual and technical demonstration. I am now fully prepared and welcome any specific technical questions you may have about my implementation."*
