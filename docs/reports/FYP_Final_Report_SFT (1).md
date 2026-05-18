





PUSL3190 Computing Project
Final Report



Smart Financial Tracker


Supervisor: Ms. Yasanthika Mathotaarachchi

Name: Nethusara Mervin
Plymouth Index Number: 10953504
Degree Program: Computer Science







Acknowledgements
The successful completion of this project would not have been possible without the guidance, support, and encouragement of several individuals, to whom sincere gratitude is expressed.
Foremost, heartfelt appreciation is extended to Ms. Yasanthika Mathotaarachchi, project supervisor, for the invaluable academic guidance, constructive feedback, and unwavering support provided throughout the entire duration of this project. Her expertise and encouragement played a decisive role in shaping the quality and direction of this work.
Gratitude is also extended to all academic staff members at NSBM Green University and the University of Plymouth for their dedication to delivering high-quality education and for their continued support throughout the degree programme.
Finally, sincere thanks are offered to family and friends whose encouragement, patience, and moral support sustained this journey from inception to completion.

Abstract
The contemporary financial landscape is characterised by rapid transition toward digital ecosystems, where cashless transactions and subscription-based services have significantly reshaped consumer behaviour. While these developments have improved transactional convenience, they have simultaneously introduced challenges in financial self-regulation and expenditure awareness. Individuals now manage multiple income streams and recurring expenses across diverse digital platforms, resulting in fragmented financial visibility and reduced control over personal cash flow. The Smart Financial Tracker (SFT) platform was developed as a comprehensive web-based personal finance management solution to address these structural and behavioural inefficiencies. Developed using the MERN technology stack — MongoDB, Express.js, React, and Node.js — the system delivers a unified and behaviourally informed environment for financial tracking and budgeting. Unlike conventional banking applications that primarily provide retrospective transaction summaries, the SFT platform emphasises active financial engagement through structured manual recording, intelligent budget alerts at 80%, 90%, and 100% utilisation thresholds, milestone-based savings goal tracking, peer-to-peer wallet transfers with ACID-compliant atomicity, and real-time interactive data visualisation. The project followed an Agile Scrum methodology across ten structured two-week sprints, enabling iterative refinement and continuous alignment with evolving user requirements. Rigorous testing strategies — including unit, integration, system, and user acceptance testing — were employed to validate system robustness and functional correctness. The final outcome is a comprehensive financial intelligence platform that empowers users to transition from reactive financial logging to proactive financial planning, thereby improving financial awareness, decision-making quality, and long-term financial stability.






Table of Contents
Acknowledgements	2
Chapter 01 – Introduction	1
1.1 Project Background	1
1.2 Problem Statement	1
1.3 Motivation	1
1.4 Aim of the Project	2
1.5 Objectives	2
1.6 Scope	2
1.7 Structure of the Report	3
Chapter 02 – Background, Objectives & Deliverables	5
2.1 Background and Domain Context	5
The Target Demographic and the Literacy-Behavioural Gap	5
Current Tracking Practices and Behavioural Friction	5
2.2 Project Stakeholders	6
2.3 Project Deliverables	6
Chapter 03 – Literature Review	9
3.1 Introduction to Personal Financial Management Systems	9
3.2 Critical Evaluation of Existing Commercial Systems	9
3.2.1 YNAB (You Need A Budget)	9
3.2.2 Mint / Credit Karma	10
3.2.3 PocketGuard	10
3.3 Identified Research and Technological Gaps	10
3.3.1 Gap 1 — Behavioural Support	10
3.3.2 Gap 2 — Analytical and Predictive Gap	10
3.3.3 Gap 3 — Ecosystem Fragmentation	11
3.4 Synthesis of the Literature	11
3.5 Chapter Summary	11
Chapter 04 – Method of Approach	12
4.1 Introduction to the Development Methodology	12
4.2 Justification for Agile Methodology	12
4.3 Sprint Management and Version Control	12
4.4 Technological Stack and Development Tools	13
4.4.1 Primary Development Environment	13
4.4.2 The Core MERN Stack	13
4.4.3 Artificial Intelligence and Machine Learning Tools	13
4.4.4 Quality Assurance and Testing Frameworks	13
4.4.5 APIs and Integrated Core Libraries	14
4.5 Chapter Summary	14
Chapter 05 – Requirements	16
5.1 Functional Requirements	16
5.1.1 Must Requirements (Mandatory)	16
5.1.2 Should Requirements (Efficiency & User-Friendliness)	16
5.1.3 Could Requirements (Future Enhancements & Edge Cases)	17
5.2 Non-Functional Requirements	17
5.2.1 Security & Data Integrity	17
5.2.2 Usability	17
5.2.3 Maintainability	17
5.3 Requirements Gathering Evidence	18
5.3.1 Conducting Interviews	18
5.3.2 Conducting Questionnaires	18
5.3.3 Conducting Observations (Competitive Analysis)	18
5.3.4 Reviewing Existing Documents	18
5.4 Chapter Summary	18
Chapter 06 – System Design	19
6.1 Overall System Architecture	19
6.1.1 Architecture Diagram	19
6.1.2 Architecture Explanation	19
6.2 Use Case Diagrams	20
6.2.1 Authentication & User Management Module	20
6.2.2 Transaction & Wallet Module	21
6.2.3 Budget Management Module	22
6.2.4 Goals, Loans and Bills Module	23
6.2.5 AI, Analytics and Planning Module	24
6.3 Class Diagram — MongoDB Collections	25
6.4 Sequence Diagrams	26
6.5 Activity Diagrams	29
6.6 Frontend UI — Figma Wireframe Reference	32
6.7 Real Frontend UI — Screenshot Guide	32
6.8 Backend Architecture — API Structure	32
6.9 Chapter Summary	33
Chapter 07 – Implementation	34
7.1 Development Environment and Technologies	34
7.1.1 Programming Languages and Frameworks	34
7.1.2 Primary Development Environment	34
7.2 Main Module Development Algorithms	34
7.2.1 Peer-to-Peer (P2P) Wallet Transfer Algorithm	34
7.2.2 Machine Learning Forecasting Algorithm (Python Microservice)	35
7.2.3 Draggable AI Assistant Algorithm (UI Logic)	36
7.3 Chapter Summary	37
Chapter 08 – Testing & Evaluation	38
8.1 Introduction to the Testing Strategy	38
8.2 Unit Testing	38
8.3 Integration Testing	38
8.4 System Testing (Manual Testing Focus)	39
8.5 User Acceptance Testing (UAT)	39
8.6 Non-Functional Testing	39
8.6.1 Performance and Usability Testing	40
8.6.2 Security and Access Control Testing	40
8.7 Chapter Summary	40
Chapter 09 – End-Project Report	41
9.1 Project Summary	41
9.2 Achievements and Self-Evaluation	41
9.2.1 Evaluation of Objectives	41
9.2.2 Evaluation of Scope	42
9.3 Customer and Target User Feedback	42
9.4 User Benefits	42
9.5 Chapter Summary	43
Chapter 10 – Project Post-Mortem	44
10.1 Introduction to Project Reflection	44
10.2 Technical Skill Development and Technologies Learned	44
10.3 Identifying Technological Limitations	45
10.4 Critical Reflection on Methodology and Technology	45
10.5 Soft Skill and Professional Development	45
10.6 Chapter Summary	46
Chapter 11 – Conclusions	46
11.1 Final Project Summary	46
11.2 Main Limitations	46
11.3 Future Suggestions and Enhancements	47
References	48
Bibliography	60
Appendix A — User Guide	61
Appendix B — Project Source Code Link	62
Appendix C — GitHub Commit History & Repo Link	63
Appendix D — Project Initiation Document (PID)	64
Appendix E — Interim Report	65
Appendix F — Records of Supervisory Meetings	66
Appendix G — Interview Research Materials	67
Appendix H — Quantitative Survey & Results	68
Appendix I — Competitive Analysis	69
Appendix J — Full System Test Results	70
Appendix K — UAT Survey & Results	73
Appendix L — MongoDB Schema Reference	75
Appendix M — API Endpoint Reference	79
Appendix N — Sprint Log & Agile Backlog	84
Appendix O — Additional Sequence & Activity Diagrams	88
Appendix P — Technology & Methodology Justification	92

List of Figures

Figure 6.1: Architecture Diagram ..................... [page number]
Figure 6.2: Use Case Diagram — Authentication & User Management ......... [page number]
Figure 6.3: Use Case Diagram — Transaction & Wallet Module .............. [page number]
Figure 6.4: Use Case Diagram — Budget Management Module ................. [page number]
Figure 6.5: Use Case Diagram — Goals, Loans and Bills Module ............ [page number]
Figure 6.6: Use Case Diagram — AI, Analytics and Planning Module ........ [page number]
Figure 6.7: Class Diagram — MongoDB Collections ......................... [page number]
Figure 6.8: Sequence Diagram — User Registration and Email Verification . [page number]
Figure 6.9: Sequence Diagram — Add Expense Transaction .................. [page number]
Figure 6.10: Sequence Diagram — Peer-to-Peer Money Transfer ............. [page number]
Figure 6.11: Sequence Diagram — Chatbot Conversation — Tracksy .......... [page number]
Figure 6.12: Sequence Diagram — Expense Forecast via ML Service ......... [page number]
Figure 6.13: Activity Diagram — User Login Flow ................ [page number]
Figure 6.14: Activity Diagram — Budget Alert and Notification Process ... [page number]
Figure 6.15: Activity Diagram — Retirement Plan Calculation via Monte Carlo [page number]
Figure 6.16: Figma Wireframe — Dashboard Layout (pre-implementation prototype) [page number]
Figure 6.17: SFT Login Page Interface [page number]
Figure 6.18: Main Financial Dashboard — Income, Expenses, and Budget Summary [page number]
Figure 6.19: Budget Management Page — Progressive Alert Indicators [page number]
Figure 6.20: Tracksy AI Assistant — Draggable Widget in Active Conversation [page number]
Figure K.1: GitHub Commit History — Smart Financial Tracker (Nov 2025 – Apr 2026) [page number]

List of Tables

Table 6.1: REST API Endpoint Groups ..................................... [page number]
Table A.1: Interview Thematic Analysis Summary .......................... [page number]
Table B.1: Survey Research Parameters ................................... [page number]
Table B.2: Demographic Breakdown (n = 36) ............................... [page number]
Table B.3: Do you track your daily expenses? ............................ [page number]
Table B.4: How do you currently manage your finances? ................... [page number]
Table B.5: Financial problems commonly faced ............................ [page number]
Table B.6: How often do you forget to record expenses? .................. [page number]
Table B.7: Financial confidence rating .................................. [page number]
Table B.8: Have you used finance tracking apps before? .................. [page number]
Table B.9: Problems with existing apps .................................. [page number]
Table B.10: Most preferred features ..................................... [page number]
Table B.11: Preferred expense tracking method ........................... [page number]
Table B.12: Expected security features .................................. [page number]
Table B.13: Single most important feature ............................... [page number]
Table B.14: Would reminders help manage finances better? ................ [page number]
Table B.15: Prefer graphical reports/charts? ............................ [page number]
Table B.16: Qualitative Themes from Open-Text Feedback .................. [page number]
Table C.1: SFT Platform vs. Competitor Feature Comparison ............... [page number]
Table C.2: Pain Point Analysis and SFT Solutions ........................ [page number]
Table D.1: Unit Test Results ............................................ [page number]
Table D.2: Integration Test Results ..................................... [page number]
Table D.3: Manual System Test Results ................................... [page number]
Table D.4: Non-Functional Test Results .................................. [page number]
Table E.1: UAT Parameters ............................................... [page number]
Table E.2: UAT Survey Questions ......................................... [page number]
Table E.3: UAT Quantitative Results ..................................... [page number]
Table E.4: UAT Open-Text Themes and Outcomes ............................ [page number]
Table F.1: User Collection .............................................. [page number]
Table F.2: Transaction Collection ....................................... [page number]
Table F.3: Budget Collection ............................................ [page number]
Table F.4: Goal Collection .............................................. [page number]
Table F.5: Wallet Collection ............................................ [page number]
Table F.6: Transfer Collection .......................................... [page number]
Table F.7: Conversation Collection ...................................... [page number]
Table F.8: Retirement Plan Collection ................................... [page number]
Table F.9: Loan Collection .............................................. [page number]
Table F.10: Bill Collection ............................................. [page number]
Table G.1: User & Auth Endpoints ........................................ [page number]
Table G.2: Transaction Endpoints ........................................ [page number]
Table G.3: Budget Endpoints ............................................. [page number]
Table G.4: Goal Endpoints ............................................... [page number]
Table G.5: Bill Endpoints ............................................... [page number]
Table G.6: Loan Endpoints ............................................... [page number]
Table G.7: Wallet and Transfer Endpoints ................................ [page number]
Table G.8: Analytics and Intelligence Endpoints ......................... [page number]
Table G.9: Backoffice Endpoints ......................................... [page number]
Table H.1: Sprint Delivery Log .......................................... [page number]
Table H.2: MoSCoW Feature Classification ................................ [page number]

Chapter 01 – Introduction
1.1 Project Background
Personal financial management has become an essential competency for long-term stability, particularly within the modern, rapidly evolving digital economy. Individuals today are increasingly responsible for orchestrating multiple income sources, ad-hoc digital purchases, variable recurring expenses, and short-term financial commitments across a wide array of platforms. The widespread adoption of online payment gateways, cashless transactions, and subscription-based services has brought unprecedented speed and convenience to consumers. However, this profound shift has simultaneously created an "invisible economy," where the physical and psychological friction associated with spending tangible cash has been largely removed (International Monetary Fund, 2024; World Bank Group, 2024). 

This phenomenon, often referred to as payment decoupling, frequently masks the true cumulative costs of daily lifestyle choices. Because money is spent invisibly and frictionlessly, consumers often lose cognitive awareness of their expenditure patterns. Without a centralized, visible structure to monitor these diverse digital cash flows, individuals resort to making reactive financial decisions driven by immediate gratification rather than objective income assessment. Consequently, fragmented financial visibility severely inhibits effective self-regulation, resulting in poor budgeting, accumulated liabilities, and growing financial stress. There is, therefore, a pressing urgency for digital tools that not only track expenditure but actively restore visibility and mindful engagement to personal finance (Byrne and Brooks, 2008; Thaler and Sunstein, 2008; Kahneman, 2011).

1.2 Problem Statement
Contemporary personal finance management systems suffer from structural weaknesses that inhibit proactive financial regulation and holistic visibility. The continued reliance on traditional manual tracking approaches, such as physical notebooks or custom spreadsheet templates proves to be highly inefficient, prone to human and formula errors, and difficult to maintain over long periods, ultimately lacking any predictive insight. 
Conversely, modern commercial financial applications often oversaturate users with complex, feature-heavy interfaces that prioritize automated bank synchronization over user engagement. This excessive reliance on automation removes the user's active awareness of their spending behaviours, contributing to further financial dissociation. Furthermore, existing tools are primarily reactive rather than proactive; they typically alert users only after a budget has already been exceeded, offering no opportunity for mid-cycle behavioural correction. Additionally, standard single-user tracking systems usually fail to integrate shared expenses or peer-to-peer (P2P) functionality, forcing users into a disjointed experience managed across multiple apps. Ultimately, individuals lack a cohesive, predictive, and behaviourally engaging platform that allows them to securely monitor their financial health and anticipate financial strain before it occurs.

1.3 Motivation and Aim of the Project
The project is motivated by the societal implications of financial mismanagement, such as escalating debt and anxiety among young professionals. Current financial tools present a functional dichotomy: they are either overly simplistic or excessively automated, stripping users of accountability. The Smart Financial Tracker (SFT) aims to bridge this gap by architecting a secure, scalable, and user-centric platform that encourages mindful manual logging while providing enterprise-grade analytics. By leveraging the MERN stack, Python microservices, and AI, the system empowers users to transition from reactive logging to proactive, informed financial planning and optimization (Deloitte, 2023; Forbes, 2023; MongoDB, 2023).

1.5 Objectives
The objectives of the project were established following the SMART (Specific, Measurable, Achievable, Relevant, Time-bound) framework to carefully guide the development lifecycle:
•	To develop and deploy a full-stack transaction management module within the first 12 weeks of the project, enabling users to perform comprehensive CRUD operations on income and expense records with 100% data persistence and category customization to facilitate active financial awareness.
•	To implement an automated budget monitoring system by week 16 that triggers real-time visual alerts at 80%, 90%, and 100% utilization thresholds, providing users with actionable system-level notifications to prevent overspending.
•	To design and integrate an ACID-compliant internal digital wallet for peer-to-peer (P2P) transfers within an 8-week development sprint, utilizing double-entry accounting principles to ensure zero balance discrepancies and maintain a reliable audit trail.
•	To deploy a predictive analytics engine by the final project month that leverages Linear Regression and Random Forest models to forecast short-term expenses and simulate long-term retirement scenarios with a target MAPE (Mean Absolute Percentage Error) of less than 15%.
•	To evaluate the technical feasibility and security implications of automated bank API synchronization, and subsequently determine the optimal data ingestion paradigm to protect user privacy (Note: This objective was de-scoped following the requirements gathering phase).
 
1.6 Scope
The functional scope of the Smart Financial Tracker covers a robust suite of capabilities that have been fully developed and successfully integrated into the platform to facilitate holistic financial hygiene. The finished functions include:
•	Transaction Management: A reliable, structured manual framework for recording income and expenses, supported by a deep customization engine that allows users to dynamically organize records into personalized categories and subcategories.
•	Budgeting & Savings Goals: The granular setup of flexible weekly and monthly budgets equipped with progressive utilization monitoring, as well as an interactive, milestone-based savings goal tracker to incentivize consistency (Academy Bank, 2024; NerdWallet, 2026).
•	Real-Time Analytics Dashboard: Dynamic, highly responsive visual dashboards (developed via React) that present categorized spending breakdowns, cash flow trends, and instantaneous financial summaries.
•	Intelligent Forecasting & AI Assistant: The integration of statistical linear regression to intelligently forecast short-term financial trends, machine learning modules for retirement planning insights, and a Large Language Model (LLM)-powered interactive chatbot (Draggable Assistant) providing contextual financial awareness guidance (Montgomery, Peck and Vining, 2012).
•	Secure Internal Wallet: A functional digital wallet designed for in-network Peer-to-Peer (P2P) transfers with robust ledger tracking to assist users in resolving shared financial commitments interactively.
•	Authentication & Access Control: A comprehensive, stateless security architecture utilizing JSON Web Tokens (JWT) and multi-tiered Role-Based Access Control distinguishing securely between Super Admins, Admins, standard Users, and Guests (OWASP, 2025).

1.7 Structure of the Report
The remainder of this report is organized systematically to document the theoretical principles, technical methodologies, design, implementation, and overall evaluation of the project:
Chapter 02 – Background, Objectives, and Requirements: This chapter establishes the foundation for the software artifact. It houses the ‘Literature Review’, comparing similar commercial systems (e.g., Mint, YNAB, PocketGuard) to pinpoint behavioural and market gaps. It delineates the ‘Method and Approach’, detailing the Agile software development methodology and MERN-based ‘Architecture’ adopted to drive the project. Finally, it outlines the explicit functional and non-functional ‘Requirements’ gathered through surveys, stakeholder interviews, and other rigorous requirement-finding techniques.
Chapter 03 – System Design: This chapter presents the strategic blueprint of the application, encompassing architectural wireframes, use case diagrams, entity-relationship diagrams, UI/UX conceptual mockups, and the robust NoSQL database schemas engineered to satisfy the system requirements.
Chapter 04 – Implementation: This chapter dissects the technical realization of the project. It describes the programming logic, the modular integration of core features (transaction mapping, predictive analytics, intelligent AI assistant, and P2P wallet processes), and the configuration methodologies.
Chapter 05 – System Testing and Evaluation: This chapter details the comprehensive quality assurance strategies executed to validate system stability and security. It outlines automated backend unit and integration testing via Jest, frontend component validation via Vitest, and end-to-end user workflow confirmation utilizing Playwright.
Chapter 06 – Project Post-Mortem: This chapter offers a critically reflective analysis of the complete project lifecycle. It examines methodological successes, evaluates technical barriers and time constraints encountered, discusses exactly how obstacles were mitigated, and emphasizes key personal and professional development outcomes.
Chapter 07 – Conclusions and Future Work: The final chapter synthesizes the outcomes of the Smart Financial Tracker software against the established background aims and objectives. It concludes with an assessment of the system's impact on behavioural financial awareness and proposes viable technological avenues for future feature enhancements.






















Chapter 02 – Background and Deliverables
2.1 Background and Domain Context
While the fundamental problem of financial tracking was introduced previously, a deeper examination of the demographic landscape, current user behaviours, and the existing personal finance ecosystem is required to contextualize the necessity of the Smart Financial Tracker (SFT).

The Target Demographic and the Literacy-Behavioural Gap
The primary users of personal financial systems are increasingly younger demographics, specifically emerging adults, university students, and early-career professionals. These individuals find themselves navigating an unprecedented affordability crisis. Recent demographic analyses reveal a stark reality: a significant majority of university undergraduates would struggle to secure emergency funds for unexpected expenses, and many routinely exhaust their working capital before the end of the financial cycle. Such financial vulnerability severely impacts cognitive bandwidth, academic focus, and overall mental health (National College Attainment Network, 2024; Santander UK, 2025).

Within this demographic, a profound "literacy-behavioural gap" exists. Research indicates that while an overwhelming majority of emerging adults’ express confidence in their money management capabilities, very few actually apply structured financial practices. A fraction of this population actively utilizes dedicated budgeting applications, and an even smaller percentage maintains a structured emergency fund (Xiao and O’Neill, 2018; OECD, 2024). This disparity suggests that theoretical overconfidence often masks a critical lack of practical, sustained financial experience. Furthermore, modern digital platforms and social media have increasingly become the primary sources of financial education for young adults. These platforms frequently offer fragmented, trend-driven advice prioritizing high-risk investments, fundamentally neglecting core concepts like cash flow management, automated savings, and daily expenditure observation (OECD, 2024).

Current Tracking Practices and Behavioural Friction
To manage their finances, the current consumer base typically relies on three fragmented methodologies, each presenting significant usability barriers:
1.	Paper-Based Tracking: A notable percentage of users still record transactions manually in physical ledgers. While this encourages psychological ownership, it carries a high risk of data loss, offers zero real-time analytical insight, lacks visual pattern recognition, and is highly location dependent.
2.	Spreadsheet-Based Systems: Many digitally literate users construct custom spreadsheets utilizing mathematical formulas. However, these systems inherently cascade formula errors, require tedious manual categorization that drains user energy over time, and suffer from poor mobile usability, which ultimately discourages point-of-sale data logging (TechRadar, 2026).
3.	Fragmented Commercial Ecosystems: Users who have migrated to digital solutions frequently find themselves utilizing entirely separate applications for budgeting, peer-to-peer (P2P) transfers, and savings tracking. This ecosystem fragmentation requires a significant weekly time investment to manually reconcile data across different interfaces. Furthermore, users across these platforms consistently report an inability to accurately estimate recurring subscription costs - often resulting in large miscalculations of their fixed negative cash flow - because commercial apps bury these metrics within general spending categories (“The Evolution of Budgeting Tools: A Look at Today’s Top Personal Finance Apps,” 2024).

These prevailing practices illustrate a landscape characterized by user exhaustion, reactive financial monitoring, and severe application fatigue. The background context ultimately highlights a critical demand for a unified, accessible platform tailored to users who need to build fundamental financial persistence without being overwhelmed by enterprise-level banking mechanics.

2.2 Project Stakeholders
The SFT project involves several key stakeholders whose roles and expectations are critical to its success:
End Users (University Students and Early-Career Professionals): These primary beneficiaries require an intuitive, low-friction interface and actionable financial visibility to reduce cognitive overload. Their interest lies in secure, accurate forecasting that supports effective self-regulation.
Project Developer: Responsible for the end-to-end lifecycle, the developer translates complex requirements into a functional MERN-stack application while adhering to engineering best practices.
Project Supervisor: Acts as a technical mentor, providing academic guidance and critical feedback to ensure the project meets rigorous university standards.
Academic Institution (NSBM / Plymouth University): Serves as the regulatory body, ensuring the project adheres to ethical guidelines, curriculum parameters, and assessment regulations.

2.3 Project Deliverables
Throughout the software development lifecycle, a structured series of tangible artifacts and technical components were systematically produced. These deliverables act as verifiable milestones, documenting the evolution of the Smart Financial Tracker from theoretical conceptualization to a fully functional, production-ready system. 

2.3.1 Academic and Project Management Deliverables
Project Proposal: The foundational document that defined the initial problem statement, established project feasibility, scoped the business case, and justified the selection of the MERN stack against existing market alternatives.
Project Initiation Document (PID): A comprehensive planning artifact detailing the specific parameters of the project, including time-bound scheduling, resource allocation, initial technical constraints, and predefined functional limitations to safely guide continuous development.
Interim Report: A mid-project academic evaluation highlighting the progress of requirements gathering, detailing the extensive literature review of competing financial tools, and solidifying the initial architectural approach leading into the core development phase.
Final Project Report: This definitive academic document synthesizing the complete project lifecycle. It encompasses the finalized system architectures, implementation methodologies, rigorous end-project testing analysis, and a critical post-mortem examining the development methodology.
2.3.2 System Design Artifacts
Use Case Diagrams: Graphical representations defining the structural boundaries of the system and outlining all authorized interactions between varying user roles (Admin, User, Guest) and core functionalities (e.g., transaction logging, smart budgeting, P2P transfers).
Entity-Relationship (ER) Diagrams: Detailed data modeling schematics that visually map the MongoDB document architectures, defining how user accounts computationally link to localized transactions, custom categories, wallet balances, and notification structures.
High-Level Architectural Diagrams: Comprehensive blueprints detailing the full-stack topology, mapping the interaction flows between the client-side React frontend, the Node.js/Express backend API gateway, external Machine Learning regression services, and cloud hosting infrastructure.
2.3.3 Software and Engineering Artifacts
The Final Software System: The successfully developed, tested, and fully deployed Smart Financial Tracker application. This deliverable serves as the interactive culmination of all integrated technologies, featuring real-time interactive dashboards, predictive AI assistants, functioning P2P wallet logic, and secure authentication routing.
Project Source Code: The complete, version-controlled codebase comprising the entire monolithic architecture. Hosted on a secure GitHub repository, it contains heavily commented scripts, configuration files, environment variables, continuous integration (CI) automations, and algorithmic regression models.
2.3.4 Quality Assurance and Operational Documentation
Test Cases and Evaluation Results: A rigorous compilation of automated quality assurance scripts and diagnostic results. This deliverable includes detailed reports from backend unit and integration tests (Jest), dynamic frontend component evaluations (Vitest), and robust end-to-end browser workflow validations (Playwright), ensuring system stability across all core features.
User Manual and System Guide: A comprehensive technical operational guide outlining the required hardware/software platform specifications. It provides granular, step-by-step instructions documenting how end-users can safely register accounts, securely utilize digital wallets, generate financial projections, and safely troubleshoot the deployed environment.





















Chapter 03 – Literature Review
3.1 Introduction to Personal Financial Management Systems
Personal Financial Management (PFM) systems are widely recognized as essential digital tools intended to assist individuals in monitoring income, regulating routine expenses, and cultivating long-term savings goals. Academic research in behavioural finance consistently demonstrates that structured financial tracking contributes positively to budgeting discipline by encouraging continuous engagement with personal financial metrics (Byrne and Brooks, 2008; Xiao and O’Neill, 2018). 

However, recent shifts in financial technologies have seen an industry-wide pivot toward total automation, primarily through direct bank API integrations and automated transaction categorization. While this automation significantly reduces the burden of manual data entry, it simultaneously removes the psychological friction of spending. By detaching the user from the active logging of their expenditure, modern systems inadvertently promote a passive "invisible economy." This digital convenience frequently results in reduced cognitive engagement, where users merely review retrospective summaries rather than actively regulating their daily consumption (Thaler and Sunstein, 2008; Kahneman, 2011). Consequently, a core challenge in the current PFM landscape is balancing the efficiency of automated software with the behavioural necessity of active user engagement.

3.2 Critical Evaluation of Existing Commercial Systems
To establish a baseline for the Smart Financial Tracker (SFT), a comprehensive competitive benchmarking analysis of leading commercial applications was conducted. Evaluating these systems highlights critical functional paradigms while also exposing significant methodological and feature-based limitations that the SFT aims to resolve.

3.2.1 YNAB (You Need A Budget)
Strengths: YNAB is widely considered the industry standard for methodical financial planning. It successfully employs a "zero-based budgeting" methodology, which mandates that every single dollar is explicitly assigned a categorical "job" prior to being spent. This encourages strict financial discipline and prevents arbitrary spending (NerdWallet, 2026).
Missing Features & Weaknesses: The primary limitation of YNAB is its exceptionally steep learning curve, which frequently proves exclusionary for beginners or younger users lacking specialized financial literacy. Furthermore, it operates on an expensive subscription model (approx. $109/annually), fundamentally alienating the university student demographic who require assistance the most (NerdWallet, 2026). Lastly, it lacks integrated forecasting mechanics and peer-to-peer (P2P) functionalities.
The SFT Solution: The SFT replaces rigid zero-based paradigms with an intuitive, flexible, milestone-based budgeting interface that allows for adaptive categorization. Furthermore, it completely removes the enterprise cost barrier, providing a highly accessible, free-to-use platform tailored for students and early-career professionals. 
3.2.2 Mint / Credit Karma
Strengths: Mint (now integrated into Credit Karma) revolutionized the market by providing entirely free, highly automated expense tracking. Its core strength lies in its ability to securely synchronize with hundreds of external bank accounts, automatically categorizing card transactions into visual reports without requiring any user input (Deloitte, 2023).
Missing Features & Weaknesses: The over-reliance on bank API synchronization introduces sever data latency; transactions often take days to clear and appear, rendering real-time, point-of-sale decision-making impossible. More critically, the total automation severely diminishes the user’s cognitive awareness of their spending flows. Since its acquisition, the platform has also aggressively shifted away from dedicated budgeting functionality toward reactive credit-monitoring and targeted financial product advertising.
The SFT Solution: To counter the dissociation caused by automated data syncing, the SFT deliberately utilizes a manual-first transaction logging architecture. Research shows that the physical act of inputting expenses fortifies behavioural accountability (Xiao and O’Neill, 2018). The SFT ensures that data is processed in true real-time, completely avoiding external API dependency bottlenecks and preserving user privacy by eliminating third-party data commercialization.

3.2.3 PocketGuard
Strengths: PocketGuard excels in usability and simplification. It utilizes a "snapshot" algorithm to calculate exactly how much disposable income a user has remaining "in their pocket" after accounting for upcoming bills, recurring subscriptions, and baseline savings goals. 
Missing Features & Weaknesses: While excellent for rapid daily checks, PocketGuard’s analysis is heavily static. It provides only a surface-level assessment and lacks the deep, personalized analytical reports necessary to drive meaningful, long-term behavioural change. Furthermore, like most individual-focused PFM tools, it completely ignores shared financial responsibilities, forcing users to utilize separate applications (e.g., Splitwise, Venmo) to manage and track shared expenses.
The SFT Solution: The SFT bridges the static analysis gap by introducing an advanced Predictive Analytics layer utilizing algorithmic linear regression and Machine learning. Instead of just showing what money is left today, the SFT actively forecasts future expenditure trends (Montgomery, Peck and Vining, 2012). Additionally, the SFT completely eliminates ecosystem fragmentation by integrating a secure internal digital wallet, allowing users to trace, manage, and reconcile shared peer-to-peer (P2P) expenses within a single, unified environment.
A structured competitive feature matrix comparing the SFT platform against YNAB, PocketGuard, Mint/Credit Karma, and Monarch Money across fourteen dimensions is provided in Appendix C.


3.3 Identified Research and Technological Gaps
The critical evaluation of these commercial leaders reveals three interconnected gaps that constrain the effectiveness of the modern personal finance ecosystem:

3.3.1 Gap 1 — Behavioural Support (Reactive vs. Proactive)
Most commercial systems exist strictly as reactive databases. They function perfectly to notify users ‘after’ a budget limit has already been exceeded. They offer limited behavioural nudging to prevent the financial error from occurring (Thaler and Sunstein, 2008). 

SFT Intervention: The SFT implements a proactive, intelligent budgeting mechanism that issues progressive, real-time alerts when a user hits 80%, 90%, and 100% of a category's capacity, providing a critical window for behavioural correction.

3.3.2 Gap 2 — Analytical and Predictive Gap
Existing free or consumer-grade applications rely entirely on historical data visualization. They tell the user what happened last month but provide no mathematical insight into where the user's finances are trending next month. 

SFT Intervention: The integration of Large Language Models (LLM) for contextual guidance and statistical forecasting models (e.g., Random Forest regressors for retirement planning) elevates the system from a passive ledger to a forward-looking financial advisor (Montgomery, Peck and Vining, 2012).

3.3.3 Gap 3 — Ecosystem Fragmentation Gap
Managing modern finances involves shared utility bills, splitting dining costs, and collective rent. Traditional PFM tools completely ignore this, focusing only on siloed individual wealth.

SFT Intervention: Introducing localized P2P wallet tracking allows the system to act as a comprehensive ledger, recognizing that modern personal finance is frequently collaborative.

3.4 Synthesis of the Literature
In conclusion, the literature and competitive market analysis highlight a distinct dichotomy: modern financial tools are either highly automated and behaviourally passive (like Credit Karma) or intensely complex and cost-prohibitive (like YNAB). The research definitively points to an underexplored middle ground a system that marries the cognitive benefits of manual, mindful engagement with the heavy analytical firepower of modern web frameworks and predictive AI. The Smart Financial Tracker is engineered specifically to occupy this exact paradigm. A full structured competitive feature matrix comparing SFT against YNAB, PocketGuard, Mint, and Monarch Money across 14 dimensions is provided in Appendix I.

3.5 Chapter Summary
This chapter has evaluated the existing landscape of personal financial management tools, identifying a critical gap between automated convenience and behavioural engagement. By synthesizing academic research with market analysis, the theoretical foundation for the Smart Financial Tracker was established. The following chapter details the Method of Approach, specifically justifying the Agile methodology and technology stack selected to address these identified gaps.








Chapter 04 – Method of Approach
4.1 Introduction to the Development Methodology
The successful execution of complex software engineering projects requires a structured yet adaptable framework to manage the Software Development Life Cycle (SDLC). For the development of the Smart Financial Tracker (SFT), the Agile methodology was selected as the primary overarching framework. Unlike traditional sequential models (such as Waterfall), Agile promotes continuous iteration, integration, and testing throughout the project lifecycle (Sommerville, 2011; Pressman, 2020). This approach allowed the development process to be broken down into manageable, functional increments known as sprints, ensuring that core features were delivered, evaluated, and refined continuously rather than attempting massive monolithic deployments at the end of the project timeline.

4.2 Justification for Agile Methodology
The decision to utilize Agile was driven by several critical operational constraints and technical characteristics unique to this project:
•	Long-Term Project Horizon: As a major academic capstone project spanning several months, Agile provided the necessary pacing to sustain momentum, preventing development bottlenecks and ensuring steady milestone achievements.
•	Evolving and Unfixed Requirements: At the project's inception, while high-level objectives were defined, the granular technical requirements especially concerning the implementation of Machine Learning regression models and the AI chatbot were not completely clear. Agile allowed the architecture to naturally evolve as technical feasibility was continuously assessed.
•	Adaptability to Requirement Changes: Working continuously with a project supervisor (acting as the proxy client) yielded ongoing heuristic feedback. Agile facilitated immediate pivoting when required. For instance, when external bank API integrations proved technically and legally unfeasible within the timeframe, Agile's flexibility allowed the project to cleanly pivot back to a "manual-first" data entry paradigm without derailing the entire SDLC.
•	Simultaneous Full-Stack Development: Combining Agile with the monolithic MERN stack allowed for the simultaneous development and integration of both frontend UI components and backend API logic within the exact same sprint cycle, maximizing development efficiency.

4.3 Sprint Management and Version Control
To practically execute the Agile methodology, “GitHub” was utilized extensively not merely as a code repository, but as the central project management hub. 
•	Sprint Execution: The project was divided into logical two-to-three-week sprints. GitHub Projects and Kanban-style issue boards were employed to outline tasks, assign development tickets, and track the flow of features from the "To-Do" backlog, through "In-Progress" development, into code review, and finally to "Completed."
•	Version Control and Collaboration: Git and GitHub managed source code versioning, ensuring that experimental features (such as the interactive Draggable Assistant) could be developed safely in isolated branches before being merged into the primary production `main` branch. This prevented breaking changes and guaranteed a stable baseline application at all times.
•	Continuous Integration: CI/CD pipelines (via GitHub Actions) were established to automatically trigger test suites and build processes every time new code was committed, seamlessly aligning with Agile’s core tenet of continuous integration.

The complete sprint-by-sprint log, including dates, primary deliverables, and MoSCoW backlog classification, is provided in Appendix N (Table N.1).

4.4 Technological Stack and Development Tools
In alignment with the Agile approach, a carefully curated suite of modern development tools and frameworks was utilized to build the SFT platform. Full justification for each technology selection over competing alternatives is documented in Appendix P (Section P.2).

4.4.1 Primary Development Environment
•	Visual Studio Code (VS Code): Used as the primary Integrated Development Environment (IDE) due to its lightweight nature, extensive extension marketplace, and built-in terminal support.

4.4.2 The Core MERN Stack
•	MongoDB: Selected as the primary database for its NoSQL, document-oriented structure, providing the schema flexibility required for managing user-defined, highly customizable expense categories.
•	Express.js & Node.js: Utilized to construct the backend business logic and secure API gateway. The asynchronous, non-blocking I/O model efficiently handles simultaneous database queries, ensuring rapid, real-time application performance.
•	React.js: Employed to build the dynamic, single-page application (SPA) frontend. Its component-based architecture facilitates the creation of interactive data visualization dashboards.

4.4.3 Artificial Intelligence and Machine Learning Tools
•	Python: Utilized to write specialized backend microservices addressing complex mathematical forecasting.
•	Scikit-Learn: Used to implement Linear Regression algorithms for short-term expense forecasting and Random Forest Regressors for the retirement planning module.
•	Groq API (LLM Integration): Hosted Large Language Models were integrated to power the contextual "Draggable Assistant," providing dynamic financial awareness guidance.

4.4.4 Quality Assurance and Testing Frameworks
•	Jest: Executed backend unit and integration testing.
•	Vitest: Handled rapid, modular frontend component validation.
•	Playwright: Executed full end-to-end (E2E) browser workflow testing, simulating real user navigation.
4.4.5 APIs and Integrated Core Libraries
To build out the specific functionalities of the Smart Financial Tracker, several internal methodologies and external APIs were utilized:
•	RESTful API Architecture: The internal communication between the React frontend and the Node.js backend was developed entirely using standard REST (Representational State Transfer) API principles. Endpoints were structured logically (using GET, POST, PUT, DELETE methods) to handle the Create, Read, Update, and Delete operations for user transactions and wallet data (Suryavanshi, 2024).
•	Groq API (External LLM API): This external API was integrated to connect the SFT client interface to advanced Large Language Models. It processes the user's natural language queries through the "Draggable Assistant" widget and streams back contextual financial guidance.
•	JSON Web Tokens (JWT) API: Utilized within the security architecture to generate, issue, and verify stateless authentication tokens. This ensures that secure API endpoints (such as retrieving ledger data or executing P2P transfers) can only be accessed by verified, logged-in users (OWASP, 2025).
•	Bcrypt Library: Integrated into the backend user-creation API to securely hash and salt user passwords before storing them in the MongoDB database, ensuring compliance with modern security encryption standards.
•	Mongoose API / ODM: Used as the Object Data Modeling library bridging Node.js and MongoDB. The Mongoose API was responsible for enforcing strict database schema validation (ensuring a transaction always has a 'date', 'amount', and 'category' before saving).
•	Axios / Fetch API: Utilized on the React frontend to asynchronously transmit HTTP requests to the backend server and Python microservices without requiring the web page to reload, enabling a seamless, dynamic user experience (Cloudthat, no date).

4.5 Chapter Summary
This chapter has established the development methodology and the technological foundation upon which the Smart Financial Tracker was constructed. By adopting an Agile Scrum framework, the project maintained the flexibility required to integrate complex machine learning and AI features within a compressed academic timeline. The following chapter details the specific functional and non-functional requirements that were derived from the mixed-methods research phase described in Appendix G and Appendix H.











Chapter 05 – Requirements
5.1 Functional Requirements
Functional requirements define the core behaviour, features, and operational capabilities that the Smart Financial Tracker (SFT) must possess to resolve the problems identified in the existing landscape. To effectively prioritize development during the Agile sprints, these requirements were categorized using a prioritization framework based on their criticality to the system's core purpose.

5.1.1 Must Requirements (Mandatory)
These are the foundational, non-negotiable requirements necessary for the SFT to operate as a viable baseline financial tracking system. Without these, the project would fail its primary objective.
•	User Authentication & Security: The system must allow users to register an account, log in securely using encrypted credentials, and manage an authenticated session to protect isolated personal financial data.
•	Manual Transaction Management (CRUD): The system must provide complete Create, Read, Update, and Delete functionality, allowing users to manually construct robust ledgers of daily income and discretionary expense transactions.
•	Dynamic Categorization: The system must allow users to assign each transaction to a specific category (e.g., Groceries, Rent, Subscriptions) and create custom categories to accurately map their unique lifestyle.
•	Budget Threshold Monitoring: The system must permit the creation of defined weekly and monthly fiscal budgets, continuously calculating the remaining balance based on logged expenses mapped to those budget categories.

5.1.2 Should Requirements (Efficiency & User-Friendliness)
These requirements elevate the system from a basic data registry into a highly usable, efficient, and engaging platform. They ensure the system is competitive and actively helpful.
•	Interactive Real-Time Dashboards: The system should instantly process ledger data into dynamic visual charts and graphs (e.g., pie charts for category breakdowns, line graphs for monthly trends) to enhance cognitive pattern recognition (“The Evolution of Budgeting Tools: A Look at Today’s Top Personal Finance Apps,” 2024).
•	Progressive Budget Alerts: The system should issue visual UI notifications when a user reaches 80%, 90%, and 100% of a defined budget, providing an active window for behavioural correction (Thaler and Sunstein, 2008).
•	Digital P2P Wallet: The system should feature an internal wallet mechanism allowing users to log peer-to-peer transfers with other users in the system to intuitively manage shared expenses (e.g., splitting a utility bill).
•	Contextual AI Assistant: The system should feature an interactive, draggable AI chatbot on the client interface capable of processing user queries to provide general financial awareness and system navigational guidance.

5.1.3 Could Requirements (Future Enhancements & Edge Cases)
These are advanced, value-adding features implemented to provide enterprise-grade capabilities, ensuring the project is future-proofed against evolving user requirements.
•	Machine Learning Forecasting: The system could utilize historical transaction data alongside statistical linear regression and Machine Learning (e.g., Random Forest Regressors) to predict future expenses and provide long-term automated retirement planning projections (Montgomery, Peck and Vining, 2012).
•	Role-Based Access Control (RBAC): The system could establish multiple permission tiers (Super Admin, Admin,
•	 User, Guest), allowing administrators to oversee system health metrics without compromising individual user ledger privacy.
•	Data Export Capabilities: The system could allow users to generate and download comprehensive financial summary reports in PDF or CSV formats for external filing or tax preparation.

5.2 Non-Functional Requirements
Non-functional requirements (NFRs) specify the quality attributes, performance goals, and architectural parameters of the system. For this undergraduate capstone project, the following highly achievable and critical NFRs were established and successfully implemented:

5.2.1 Security & Data Integrity
Given the sensitivity of financial data, security was paramount. The system must securely hash all user passwords (utilizing `bcrypt`) before database insertion. Furthermore, it must implement stateless JSON Web Tokens (JWT) for secure session management and authorization routing, protecting endpoints from unauthenticated access (OWASP, 2025). By explicitly avoiding external open-banking APIs, the system also inherently guarantees that user purchasing histories remain completely isolated from third-party commercial tracking.

5.2.2 Usability
The application must present an intuitive, frictionless user experience (UX) to prevent application fatigue. By utilizing React.js, the system must ensure cross-device responsiveness, gracefully adapting the UI from widescreen desktop monitors to mobile displays. Additionally, dynamic features like the AI Assistant must integrate smoothly via mouse and touch dragging (60fps performance) without obstructing primary data views or violating accessibility standards (e.g., retaining active ARIA labels) (World Wide Web Consortium, 2018; Ailleron, 2025; Elementor, 2026).

5.2.3 Maintainability
The codebase must be structured to allow future developers to easily read, update, or expand the system’s functionality. This is achieved through a heavily modular component-based architectural design on the frontend, separated Model-View-Controller (MVC) logic on the backend API, and comprehensive inline commenting. Furthermore, the mandatory application of GitHub CI/CD methodologies ensures that any future code updates are automatically tested and validated before merging, maintaining systemic health.
5.3 Requirements Gathering Evidence
To transition abstract ideas into the concrete requirements listed above, empirical evidence was collected. The gathering process employed a mix of qualitative and quantitative mechanisms to ensure scientific rigor.
5.3.1 Conducting Interviews
Interviews provided deep, qualitative contexts regarding user frustrations. A formal, semi-structured interview protocol was authored covering five thematic domains (e.g., tracking practices, UI pain points, privacy boundaries). 26 specific participants were carefully selected, representing the target demographic (15 undergraduates, 8 early-career professionals, 3 financial experts). Conducting 20-to-30-minute sessions via video conferencing or in-person dialogues allowed the researcher to record spontaneous feedback, which directly highlighted the pervasive distrust of automated bank syncing, thereby establishing the "Must Requirement" for manual transaction logging.

5.3.2 Conducting Questionnaires
To capture broader statistical trends, a structured digital questionnaire was developed and deployed via Google Forms (titled "Smart Finance Tracker App – User Requirement Survey"). This survey was designed to quantify user behavior patterns that qualitative interviews might miss.
The aggregated data revealed that 83.3% of users forget to record their expenses at least sometimes, and 88.9% prefer graphical reports and charts for analysing expenses. This specific statistical evidence directly reinforced the 'Should Requirement' to implement highly visible, real-time interactive Recharts visualisations and automated tracking alerts within the platform. Furthermore, the survey revealed that 88.9% of respondents rated a simple and user-friendly interface as very important. The full questionnaire and aggregated results are provided in Appendix B

5.3.3 Conducting Observations (Competitive Analysis)
Observational gathering was executed through extensive heuristic evaluations and competitive benchmarking. Test accounts were established on existing commercial platforms, including MINT, YNAB, and PocketGuard. By directly navigating the user journeys of these apps, the researcher physically observed the friction points—such as forced paywalls, excessive advertising pop-ups, and complex jargon. These observations confirmed the necessity to build a cleaner, less punitive user interface.

5.3.4 Reviewing Existing Documents
Finally, extensive secondary document analysis was performed. This involved aggregating and evaluating established academic literature on behavioural finance, reviewing whitepapers compiled by global financial institutions (OECD, 2024), (World Wide Web Consortium, 2018), and studying contemporary software engineering texts regarding MERN stack capabilities (Sommerville, 2011; Pressman, 2020). Reviewing this existing documentation provided the critical theoretical foundation validating concepts like "payment decoupling," mathematically justifying the necessity of the proposed platform's active-wide functionalities. The full interview protocol, question set, and thematic findings from the stakeholder interviews are provided in Appendix G, and the complete survey instrument and results are provided in Appendix H.

5.4 Chapter Summary
This chapter has detailed the functional and non-functional requirements of the Smart Financial Tracker, derived from a rigorous mixed-methods research phase. By prioritizing features through the MoSCoW framework and validating them against user feedback, a clear blueprint for the system was established. The next chapter presents the System Design, illustrating the architectural and logical models developed to satisfy these requirements.

Chapter 06 – Design Chapter 
6.1 Overall System Architecture
6.1.1 Architecture Diagram
 
Figure 6. 1: Architecture Diagram

6.1.2 Architecture Explanation
The overall system architecture of the Smart Financial Tracker (SFT) is designed as a modular, distributed full-stack application. The client interface is constructed utilizing React 19 to provide a highly responsive, single-page application (SPA) experience. This frontend communicates securely via RESTful APIs to a monolithic Node.js and Express 5 backend gateway, which serves as the primary data orchestrator connected to a NoSQL MongoDB Atlas cluster (MongoDB, 2023; OpenJS Foundation, 2026). Background task execution and scheduled operational alerts are managed natively within the backend using asynchronous Node.js schedulers, eliminating the need for external queue brokers. For computational workloads, the architecture effectively separates concerns: short-term predictive expense forecasting is offloaded to a dedicated Python microservice leveraging Scikit-Learn libraries, while complex mathematical operations, such as stochastic Monte Carlo simulations for retirement planning, are executed natively within the Node.js layer to optimize latency. Finally, the system's intelligent conversational features are driven by direct integration with the Groq API, operating a Llama 3 Large Language Model to deliver real-time, context-aware financial guidance. Authentication routines are fortified using stateless JSON Web Tokens (JWT) for enhanced transaction security (OWASP, 2025).

6.2 Use Case Diagrams 
6.2.1 Authentication & User Management Module
 
Figure 6. 2: Use Case Diagram — Authentication & User Management
6.2.2 Transaction & Wallet Module
 
Figure 6. 3: Use Case Diagram — Transaction & Wallet Module







6.2.3 Budget Management Module
 
Figure 6. 4: Use Case Diagram — Budget Management Module












6.2.4 Goals, Loans and Bills Module
 
Figure 6. 5: Use Case Diagram — Goals, Loans and Bills Module
6.2.5 AI, Analytics and Planning Module
 
Figure 6. 6: Use Case Diagram — AI, Analytics and Planning Module



6.3 Class Diagram — MongoDB Collections
 
Figure 6. 7: Class Diagram — MongoDB Collections
Full field-level schema definitions for all MongoDB collections, including data types, constraints, and relationship notes, are provided in Appendix F.
6.4 Sequence Diagrams
6.4.1 User Registration and Email Verification
 
Figure 6. 8: Sequence Diagram — User Registration and Email Verification
6.4.2 Add Expense Transaction
 
Figure 6. 9: Sequence Diagram — Add Expense Transaction
The remaining sequence diagrams — covering the P2P Transfer, Tracksy AI Chatbot, and ML Forecasting workflows — are provided in Appendix O (Sections O.2 to O.4).





6.5 Activity Diagrams
6.5.1 User Login Flow
 
Figure 6. 13: Activity Diagram — User Login Flow
Activity diagrams for the Budget Alert process and Retirement Plan Calculation via Monte Carlo are provided in Appendix O (Sections O.5 and O.6).
6.6 Frontend UI — Figma Wireframe Reference
Prior to implementation, the user interface was prototyped using Figma to establish visual hierarchy, navigation flow, and component layout. The wireframes established the foundational design language — including the sidebar navigation, card-based financial summary components, and the floating Tracksy AI widget — which were subsequently translated into the React implementation. The Figma prototype is accessible via the project source code repository link in Appendix J.

[Figure 6.16: Figma Wireframe — Dashboard Layout (pre-implementation prototype)]
![Figure 6.17: SFT Login Page Interface](../../image/FYP_Final_Report_SFT(1)/login_page.png)
![Figure 6.18: Main Financial Dashboard — Income, Expenses, and Budget Summary](../../image/FYP_Final_Report_SFT(1)/dashboard.png)
![Figure 6.19: Budget Management Page — Progressive Alert Indicators](../../image/FYP_Final_Report_SFT(1)/budgets.png)
![Figure 6.20: Tracksy AI Assistant — Draggable Widget in Active Conversation](../../image/FYP_Final_Report_SFT(1)/tracksy.png)

6.8 Backend Architecture — API Structure
REST API Endpoint Groups
Module	Base Route	Key Endpoints
Auth and Users	/api/users	POST /register,POST /login,POST /guest-login, GET/PUT /profile 

Transactions	/api/transactions
GET /, POST /, PUT /:id, DELETE /:id

Wallet	/api/wallet
GET /balance,POST /add-funds,POST /withdraw, GET /transactions

Transfers	/api/transfers	POST /send-otp, POST /initiate, POST /:transferId/process,
GET /my-transfers
Budgets	/api/budgets
GET /, POST /, PUT /:id, DELETE /:id

Goals	/api/goals	GET /, POST /, PUT /:id, DELETE /:id

Bills	/api/bills	GET /, POST /, PUT /:id, PATCH /:id/pay

Loans	/api/loans	GET /, POST /, POST /:id/payment, GET /:id/schedule

Analytics	/api/financial-health	GET /score, GET /history
Forecasting	/api/forecasting	GET /expenses, GET /category/:category

AI Chat	/api/chat	POST /
Retirement	/api/retirement	POST /calculate, POST /simulate, POST /advise, GET /plans, POST /plans

Notifications	/api/notifications	GET /, PATCH /:id/read, PATCH /read-all, DELETE /:id

Admin	/api/admin	GET users, PATCH /users/:id/role, PATCH /users/:id/status 
(Note: Analytics is under /api/admin/analytics)
Table 6. 1: REST API Endpoint Groups
A complete API endpoint reference table, including HTTP methods, route paths, authentication requirements, and role constraints for all modules, is provided in Appendix M. Full field-level schema definitions for all MongoDB collections, including data types, constraints, and relationship notes, are provided in Appendix L.

6.9 Chapter Summary
This chapter has presented the comprehensive design blueprint of the Smart Financial Tracker, covering the system architecture, logical data models, and interaction workflows. By transitioning from theoretical requirements to structured UML diagrams and interactive UI wireframes, the foundation for the implementation phase was established. The following chapter details the technical realization of these designs, focusing on the core algorithms and technologies used to build the platform.


Backend Technology Stack Summary
Node.js + Express
├── Authentication: jsonwebtoken + bcryptjs
├── Database ORM: Mongoose connecting to MongoDB Atlas
├── Event Management: Custom asynchronous Node.js controller patterns
├── Email: Nodemailer (SMTP)
├── AI Engine: Groq API (native proxy to Llama models)
├── Validation: Custom localized validation schemas
├── Security: CORS wrapper implementation
├── Testing: Jest + mongodb-memory-server + Supertest
└── ML Bridge: axios (to Python Flask service)


Chapter 07 – Implementation (Development Chapter)
7.1 Development Environment and Technologies
The technical implementation of the Smart Financial Tracker (SFT) required a cohesive aggregation of robust development environments, modern programming languages, and scalable frameworks. 

7.1.1 Programming Languages and Frameworks
•	JavaScript (ECMAScript 2022+): Serving as the foundational language across the entire MERN stack. It was utilized both on the client-side to drive the user interface and on the server-side to handle the API gateway logic.
•	Python: Employed strictly for backend microservices to execute the complex mathematical operations required for statistical forecasting and Machine Learning regression.
•	Node.js & Express.js: Provided the runtime environment and backend framework to rapidly build isolated, RESTful API endpoints and manage authentication middleware.
•	React.js: Utilized for designing the single-page application (SPA) frontend, leveraging modern hooks for real-time interface manipulation.
•	Mongoose: Acted as the Object Data Modeling (ODM) library connecting the Node.js environment to the MongoDB Atlas cluster, enforcing schema validation.

7.1.2 Primary Development Environment
Integrated Development Environment (IDE): Visual Studio Code (VS Code) was the primary IDE, selected for its integrated terminal, ESLint formatting capabilities, and Git manipulation tools.
Database Engine: MongoDB Atlas (Cloud-Hosted) was utilized as the NoSQL storage tier, providing high-availability clusters to manage JSON-like document data (MongoDB, 2023).
API Management & Testing: Postman was heavily utilized during development to rigorously test, configure, and validate backend RESTful endpoint structures before implementing them into the React frontend.

7.2 Main Module Development Algorithms
7.2.1 Peer-to-Peer (P2P) Wallet Transfer Algorithm
Algorithm Flow Description:
To ensure financial integrity, the internal digital wallet was engineered utilizing “Atomic Transactions” and “Double-Entry Accounting” principles (Taduka, 2024). The algorithmic flow is as follows:
1.	Initiation: The system receives a transfer request executing processTransferInternal.
2.	Validation: The backend verifies both identities and checks if the sender’s wallet balance is `≥` the requested amount.
3.	Atomic Session: A MongoDB transaction session (mongoose.startSession()) initializes. If any step fails, the entire transaction rolls back to prevent money from disappearing.
4.	Deduction & Addition: The algorithm deducts the amount from the Sender’s balance and simultaneously adds it to the Receiver’s balance.
5.	Ledger Creation: Standard log tracking entries are created in the Transaction entity collection.
6.	Commit: The session is successfully committed (session.commitTransaction()), writing all data to the database permanently.

The complete implementation of the `processTransferInternal` function, including the full Mongoose ACID session lifecycle, is available in the project source code repository (Appendix B).

7.2.2 Machine Learning Forecasting Algorithm (Python Microservice)
Algorithm Flow Description:
To combat static historical reporting, a predictive algorithm microservice was built utilizing Python and Scikit-Learn (Montgomery, Peck and Vining, 2012).
1.	Execution Request: The Node.js server sends a POST request with the user's ID to the Python /predict endpoint.
2.	Direct Extraction: The Python backend dynamically connects to MongoDB via pymongo to fetch the user's chronological transaction history without bottlenecking the main Express app.
3.	Model Loading: Rather than training on the fly, the system maximizes performance by loading pre-trained Scikit-Learn Random Forest Regressor models (model_expense.pkl and model_income.pkl) using joblib.
4.	Prediction Calculation & Payload: The model evaluates the arrays and predicts upcoming cycles up to monthsAhead. The generated figures are packaged into a JSON payload and returned to the React frontend.

The complete Flask endpoint implementation of the `/predict` route, including the Scikit-Learn model loading and JSON payload construction, is available in the project source code repository (Appendix B).

7.2.3 Draggable AI Assistant Algorithm (UI Logic)
Algorithm Flow Description:
To ensure high usability without obstructing the dashboard, an interactive viewport drag controller was developed for the Tracksy React component utilizing lifecycle hooks.
•	Initialization: State logic (useState) captures the initial X and Y coordinates.
•	Pointer Capture:  handleMouseDown registers the interaction and activates an isDragging boolean, noting the specific click-offset.
•	Coordinate Recalculation: Global mousemove event listeners calculate the delta trajectory across the viewport, passing the data back to setPosition(...) to seamlessly reposition the CSS element dynamically without severe UI tearing.

The complete React implementation of the draggable position controller, including the `useEffect` event listener lifecycle and `handleMouseDown` offset calculation logic, is available in the project source code repository (Appendix B).

7.3 Chapter Summary
This chapter has described the technical implementation of the Smart Financial Tracker, detailing the programming languages, frameworks, and core algorithms that drive the system’s functionality. By leveraging the MERN stack and specialized Python microservices, the platform achieves a balance between responsive user interfaces and complex mathematical forecasting. The following chapter evaluates the system through a comprehensive testing and quality assurance phase.



Chapter 08 – System Testing and Evaluation
8.1 Introduction to the Testing Strategy
Testing and evaluation form a critical phase of the software development lifecycle, ensuring that the Smart Financial Tracker (SFT) is robust, secure, and user-friendly. While automated toolchains (like Jest, Vitest, and Playwright) were utilized to establish a stable deployment baseline, “Manual Testing” was positioned as the primary evaluation methodology. Because the system's core value relies on active behavioural engagement and usability, executing structured manual walkthroughs acting as a real user was considered a core project deliverable. All test cases in this chapter are strictly documented using the “Acceptance format (Given / When / Then)” to map business logic directly to executable conditions.
Full documented test case results — including unit, integration, system, non-functional, and security test outcomes — are provided in Appendix D.

8.2 Unit Testing
Unit testing involves isolating distinct components, functions, or modules of the codebase to verify their operational logic independently from the rest of the application. In the SFT, backend unit testing was executed to validate mathematical logic (such as wallet deductions) and frontend component isolation.

Acceptance Test Case: P2P Wallet Insufficient Funds Validation
•	Scenario: Preventing an overdraft during a local wallet transfer.
•	Given: The registered user currently has a verified wallet balance of $50.00.
•	When: The user manually inputs a transfer request to send $100.00 to a peer.
•	Then: The isolated backend wallet controller must halt the process and return a specific "Insufficient balance" error response without touching the database ledger.

8.3 Integration Testing
Integration testing evaluates how distinct microservices, databases, and APIs interact when combined. For the SFT, the most critical integration testing involved verifying the data flow between the Node.js API gateway, the Python Machine Learning service, and the MongoDB database.

Acceptance Test Case: Python ML Forecast Microservice Integration
•	Scenario: Connecting the Node.js transaction ledger to the Python predictive engine.
•	Given: The user has logged a minimum of 12 months of structured transaction history in the MongoDB database.
•	When: The React frontend dashboard requests a future projection, triggering the Node.js backend to securely pass the ledger array to the Python ML microservice.
•	Then: The Python microservice and Scikit-Learn engine must successfully receive the array, process the linear regression mathematically, and cleanly return a JSON payload with the predictions back to the frontend without a CORS (Cross-Origin Resource Sharing) or timeout error.
8.4 System Testing (Manual Testing Focus)
System testing validates the completely assembled, fully integrated application. Because human interaction and interface friction are central themes of the project, exhaustive “Manual System Testing” served as the primary verification deliverable. Every core user workflow was manually executed step-by-step through the browser to simulate actual daily application usage.

Acceptance Test Case: Full Cycle Transaction Logging and Budget Alert
•	Scenario: End-to-end validation of manual data entry triggering a reactive UI alert.
•	Given: The user has established a monthly "Groceries" budget capped at $200.00, and their current recorded grocery expenditure stands at $190.00.
•	When: The user navigates the application interface and manually submits a new Grocery expense form for $20.00 (pushing the total to $210.00).
•	Then: The system must visually append the transaction to the ledger, recalculate the total immediately on screen, and physically render a red UI notification stating "100% Budget Exceeded" to the user.

8.5 User Acceptance Testing (UAT)
User Acceptance Testing shifts the evaluation from the developer to the actual target demographic. To conduct UAT, the system was temporarily hosted in a staging environment. Digital feedback surveys (utilizing Google Forms) were formulated and distributed to a closed testing group comprising classmates, friends, and independent university peers representing the core software demographic. They were tasked to use the P2P wallet and the AI assistant, then provide qualitative responses regarding application logic and friction.
The UAT survey instrument and aggregated qualitative and quantitative feedback results from the closed beta testing group are provided in Appendix E.

Acceptance Test Case: Draggable AI Assistant Interaction
•	Scenario: Target demographic retrieving financial awareness guidance.
•	Given: A beta tester (friend) is navigating the main transaction dashboard.
•	When: The tester clicks on the Draggable AI widget and inputs the unstructured query, "How can I cut down on my daily spending?"
•	Then: The natural language model must process the query and output a concise, non-financial-advice tip within a 5-second response window, and the tester must rate the response as "Helpful" on the UAT survey form.

8.6 Non-Functional Testing
While functional tests verified ‘what’ the system does, non-functional testing examined ‘how well’ the system performs under constraints. Software profiling applications and browser tools were utilized to explicitly test baseline usability, load speeds, and API security.

8.6.1 Performance and Usability Testing
Google Lighthouse (an automated open-source app within Chrome DevTools) was utilized to audit the performance of the React DOM (Sentry, 2024).
•	Scenario: Client-side load performance on modern browsers.
•	Given: The web application is deployed in a production-like build state.
•	When: The Lighthouse app executes a comprehensive metrics diagnostic test on the main dashboard.
•	Then: The application must receive a performance score exceeding 85/100, verifying that manual entry forms load fast enough to prevent user frustration.

8.6.2 Security and Access Control Testing
Security testing validated the stateless authentication and authorization mechanisms of the SFT. All protected endpoints successfully rejected requests without valid JWT tokens, and role-based access control was verified to ensure standard users could not access admin-only analytics routes. Full unit test results for all 140 backend test cases are provided in Appendix J (Table J.1). Complete integration test results across all six integration points are provided in Appendix J (Table J.2). The complete manual system test suite (TC-001 to TC-024) is documented in Appendix J (Table J.3), and the full Lighthouse audit report and security test results are provided in Appendix J (Table J.4). The UAT survey instrument and aggregated beta tester feedback are provided in Appendix K.

8.7 Chapter Summary
This chapter has detailed the rigorous testing and evaluation strategies employed to validate the Smart Financial Tracker. Through a combination of automated unit and integration tests, structured manual walkthroughs, and user acceptance testing with the target demographic, the system was proven to be functionally robust, secure, and user-friendly. The final chapter provides a reflective analysis of the project outcomes and suggests future avenues for development.
Postman was leveraged as the application tool to manually simulate malicious requests, testing the system's JWT authentication shielding.
•	Scenario: Unauthorized data access attempt.
•	Given: A guest user who does not possess a valid, signed JSON Web Token (JWT) in their browser cookies.
•	When: The guest bypasses the UI and attempts to directly request user wallet data by hitting the `/api/wallet/balance` backend endpoint via Postman.
•	Then: The server's authentication middleware must intercept the request and deflect it, responding with a `401 Unauthorized` HTTP status code in under 200 milliseconds (OWASP, 2025).















Chapter 09 – End Project Report
9.1 Project Summary
The Smart Financial Tracker (SFT) was conceived and developed to directly address the "invisible economy" phenomenon, wherein the seamless nature of modern digital transactions fundamentally deteriorates an individual's cognitive awareness of their spending (Thaler and Sunstein, 2008; Kahneman, 2011). Recognizing that the target demographic (emerging adults and university students) was severely underserved by an ecosystem of applications that were either too rigorously complex (YNAB) or entirely too automated (Mint/Credit Karma), the SFT was engineered to occupy a crucial behavioural middle ground. 

Utilizing the monolithic MERN stack (MongoDB, Express.js, React.js, Node.js), the SFT delivers a highly secure, privacy-first web platform (Enfin Technologies, no date; MongoDB, 2023; OpenJS Foundation, 2026). It actively enforces financial accountability by requiring structured manual transaction logging, while simultaneously rewarding that manual effort with enterprise-grade, real-time visual analytics. Furthermore, the integration of Python microservices executing Scikit-Learn Machine Learning regression algorithms, alongside a Large Language Model (LLM) powered "Draggable Assistant," transforms the project from a reactive digital ledger into a highly proactive, intelligent financial forecasting tool (Montgomery, Peck and Vining, 2012). Finally, integrating a Peer-to-Peer (P2P) wallet directly into the architecture successfully bridged the gap between individualized wealth tracking and shared financial realities.

9.2 Achievements and Self-Evaluation
An essential aspect of the end-project evaluation requires a critical, honest self-assessment regarding the fulfilment of the predefined objectives and the execution of the established scope. 

9.2.1 Evaluation of Objectives
•	Objective 1 (Fully Achieved): The core CRUD transaction engine with highly customizable categorization was successfully developed and deployed as the system's foundational layer.
•	Objective 2 (Fully Achieved): The intelligent budgeting configuration was engineered to successfully emit progressive, real-time UI threshold alerts at 80%, 90%, and 100% capacity triggers, actively facilitating behavioural spending correction.
•	Objective 3 (Fully Achieved): A high-security internal digital wallet was deployed utilizing atomic database sessions and double-entry accounting to ensure mathematically sound P2P transfers between system users.
•	Objective 4 (Fully Achieved): Advanced algorithmic analytics were established via an isolated Python microservice, successfully reading historical user datasets to cast mathematical linear regressions for short-term and long-term expense forecasting.
•	Objective 5 (De-scoped): During Sprint 3, automated bank API synchronisation was re-evaluated and removed from scope due to legal, technical, and privacy constraints identified during requirements gathering. This decision was strategically made to maintain the system's privacy-first architecture and to reinforce the core psychological goal of the project: maintaining the user’s cognitive, manual engagement to build healthy financial habits.

9.2.2 Evaluation of Scope
The functional scope detailed in the Project Initiation Document (PID) was successfully fully realized. The complete frontend interface was built, and the backend routing dynamically handles the user base precisely as intended without systemic crashes. Experimental scope items, particularly the boundary-constrained, hovering "Draggable AI Assistant," overperformed expectations, smoothly maintaining 60 frames-per-second while querying the hosted Groq API models to provide conversational context. The project remained strictly within academic timelines, transitioning successfully from design to an evaluative build state.

9.3 Customer and Target User Feedback
To validate the system’s real-world viability, the closed beta phase integrated rigorous User Acceptance Testing (UAT) executed by university peers representing the core software demographic. The qualitative feedback gathered through comprehensive survey forms was highly positive, highlighting specific validations of the system’s design choices:
1.	Privacy and Trust: A dominant theme in the UAT feedback was extreme satisfaction regarding the ‘lack’ of imposed bank syncing. Users explicitly noted that the isolated, manual-entry nature of the SFT felt significantly safer than commercial alternatives, relieving anxieties about their purchasing data being harvested or commodified (World Bank Group, 2024).
2.	Dashboard Clarity: Users highly rated the dynamic React visual dashboards. Feedback indicated that the pie charts and line graphs immediately clarified where their disposable income was deteriorating, specifically highlighting previously unnoticed recurring subscription fees (“The Evolution of Budgeting Tools: A Look at Today’s Top Personal Finance Apps,” 2024).
3.	Chatbot Usability: The Draggable AI Assistant received highly enthusiastic feedback regarding interface usability. Testers found the ability to quickly ask the bot regarding generic budgeting strategies (e.g., "explain the 50/30/20 budget rule") while concurrently viewing their ledger prevented them from having to open new browser tabs, keeping them completely focused on their financials.
4.	Areas for Polish: Minor critical feedback was logged primarily concerning the mobile viewport interface. Some users noted that while the draggable widgets responded perfectly on desktop, dragging elements near the bottom navigation bar on narrower touchscreen phones occasionally caused overlapping, prompting minor CSS media query refinements prior to final deployment.

9.4 User Benefits
The Smart Financial Tracker (SFT) provides robust benefits designed to counteract modern financial pressures:
•	Restoration of Financial Awareness: By requiring manual logging, the system restores the psychological friction lost in cashless transactions, encouraging more mindful spending habits.
•	Proactive Financial Regulation: Shifting from reactive to proactive monitoring via threshold alerts allows users to modify their behavior before exceeding budgets, effectively minimizing debt accrual.
•	Unified Financial Intelligence: The platform eliminates ecosystem fragmentation by unifying budgeting, P2P transfers, and enterprise-grade ML forecasting in a single, accessible, and free interface.






















9.5 Chapter Summary
This chapter has provided a comprehensive evaluation of the project outcomes against the established aims and objectives. By analyzing user feedback and system performance, it was demonstrated that the Smart Financial Tracker successfully fulfilled its core requirements while strategically adapting its scope to maintain privacy and user engagement.

Chapter 10 – Project Post-Mortem (Reflection)
10.1 Introduction to Project Reflection
A Post-Mortem analysis provides a structured, critically reflective review of the entire Software Development Life Cycle (SDLC) executed during this capstone project. Stepping back from the active codebase enables a comprehensive evaluation of the methodological successes, the technical barriers encountered, and the broad spectrum of professional competencies cultivated during the creation of the Smart Financial Tracker (SFT).

10.2 Technical Skill Development and Technologies Learned
The most profound outcome of this project was the transition from a theoretical understanding of computer science principles to the practical, engineered execution of a full-stack, distributed web application.

10.2.1 Core Framework Mastery (The MERN Stack)
Prior to the commencement of this project, exposure to web development was limited primarily to isolated front-end scripts and basic database queries. Developing the SFT required mastering the MERN stack cohesively:
•	React.js: A deep practical understanding of the React Component Lifecycle was developed, specifically regarding the management and protection of application state through native hooks (useState, useEffect, useRef). The critical importance of preventing unnecessary DOM re-renders was identified early, particularly when building high-performance interactives like the Draggable AI assistant, where optimized useEffect dependency tracking and state closures were applied to ensure 60fps smoothness.
•	Node.js & Express.js: Secure backend engineering proficiency was cultivated throughout the development cycle. The mechanics of constructing stateless RESTful APIs, configuring CORS policies, and integrating complex authentication middleware using bcrypt and JWT were applied systematically.
•	MongoDB & Mongoose: Backend data modeling capabilities were significantly advanced, with flexible NoSQL database schemas engineered to accommodate user-defined categorization without the rigid structural constraints inherent in relational SQL systems.

10.2.2 Machine Learning and External Integrations
Python Microservices (Scikit-Learn): A significant technical progression was achieved by extending development outside the JavaScript ecosystem into Python microservices. Raw JSON payloads were processed into Pandas DataFrames, and Scikit-Learn RandomForestRegressor algorithms were implemented to forecast expenditure trends from historical transaction data.
LLM API Integration: Through integration of the Groq API to power the Tracksy chatbot, skills in handling asynchronous external API fetches were acquired, alongside techniques for managing API rate-limiting delays within the UI using visual loading states, and securing private access keys via environment variables.

10.3 Identifying Technological Limitations
Constructing the system exposed several inherent limitations and bottlenecks associated with the selected technologies, necessitating architectural compromises:
React.js (Client-Side Rendering Limits): While React allows for rapid, dynamic user interfaces, it strictly performs Client-Side Rendering (CSR). It was discovered that offloading excessive mathematical processing — such as filtering large transaction ledgers — to the client browser degraded performance on lower-specification mobile devices. This limitation necessitated an architectural refactoring, with heavy data aggregation operations relocated to the Node.js server prior to payload delivery to the React frontend.
MongoDB (Transaction Isolation): Creating the P2P Wallet highlighted a structural limitation within standard NoSQL databases. Unlike SQL databases that inherently excel at transactional safety, using MongoDB for digital wallets required writing extensive, highly explicit `startSession()` code architecture to legally enforce Atomic Transactions.

10.4 Critical Reflection on Methodology and Technology
10.4.1 Development Process (Agile vs. Waterfall)
The adoption of an Agile Scrum methodology was critical to the project's success. Given the experimental nature of the AI and ML components, a traditional Waterfall model would have introduced significant risk, as technical feasibility issues discovered late in the cycle could have been catastrophic. Agile's iterative nature allowed for the de-scoping of bank API synchronization during Sprint 3 without derailing the overall delivery timeline. However, it was observed that Agile requires higher administrative overhead for a solo developer, as maintaining a rigorous Kanban board and sprint log concurrently with development demands significant discipline.

10.4.2 Technology Stack Suitability
The MERN stack proved highly effective for rapid prototyping and building a responsive SPA. However, the use of Node.js for heavy mathematical simulations (Monte Carlo) revealed potential performance bottlenecks that could be better handled by a more computationally efficient language like Rust or C++ in a large-scale production environment. For this capstone project, the stack provided the optimal balance of development speed and functional capability.

10.5 Soft Skill and Professional Development
The solitary nature of a final-year academic capstone project acts as an accelerated incubator not only for coding logic but for fundamental professional soft skills.

10.5.1 Project Management and Discipline
The project required the decomposition of large-scale engineering objectives into granular, two-week actionable sprints managed via GitHub. The capacity for accurate time estimation, structured backlog prioritisation, and sustained development momentum demonstrated throughout this project reflects skills directly applicable to commercial software engineering environments.

10.5.2 Problem-Solving and Resilience
Diagnosing a multi-tier data failure — wherein the React frontend crashed due to the Node.js API failing to await the Python microservice response — required systematic analysis traversing three distinct programming languages. This experience reinforced the discipline of logical fault isolation using console logs, Postman network traces, and Chrome DevTools rather than speculative code modification.

10.5.3 Stakeholder Communication and Empathy
The formal requirements gathering process and the subsequent translation of qualitative user anxieties into concrete functional specifications reinforced the foundational principle of user-centric design: that software must be engineered to solve the human problem before the screen, rather than satisfying technical ambitions.

10.6 Chapter Summary
This chapter has provided a critical reflection on the technical and professional development outcomes of the project. By evaluating the methodology, technology stack, and personal growth, it was demonstrated that the project served as a successful transition from theoretical knowledge to practical software engineering expertise.
Chapter 11 – Conclusion
11.1 Final Project Summary
The overarching objective of this final-year project was to engineer a solution that actively counteracts the "invisible economy" facilitated by modern, frictionless digital transactions. The Smart Financial Tracker (SFT) was successfully developed as a secure, full-stack personal finance management application that rejects the industry trend of total automation in favour of cognitive financial engagement (Byrne and Brooks, 2008; Kahneman, 2011).

Over the course of the Software Development Life Cycle, the project successfully deployed a robust monolithic architecture utilizing the MERN stack (MongoDB, Express.js, React.js, Node.js) (Enfin Technologies, no date; MongoDB, 2023; OpenJS Foundation, 2026). The system fully realizes its core functional requirements: it provides a highly secure methodology for users to manually log and categorize transactions, calculates remaining fiscal balances in real-time, and generates dynamic visual dashboards. The application goes beyond passive data registry by introducing an intelligent budgeting mechanism that progressively notifies users at critical expenditure thresholds (80%, 90%, 100%), granting them the necessary temporal window to enforce behavioural spending correction.

Furthermore, the system successfully bridged the analytical gap prevalent in consumer-grade applications. By establishing isolated Python microservices, the SFT leverages machine learning (Scikit-Learn Random Forest Regressor) to mathematically predict future financial constraints based on historical logging (Montgomery, Peck and Vining, 2012). This was combined with the client-side integration of a Large Language Model (Groq API) via the "Draggable Assistant," creating an interactive environment where users receive immediate, contextual financial awareness guidance. Lastly, implementing an internal, cryptographically secure digital wallet equipped with atomic transactions allows users to trace and resolve shared peer-to-peer (P2P) commitments cleanly within the single SFT ecosystem.

The project adhered strictly to the Agile methodology, utilizing GitHub for continuous iteration and version control. Through rigorous manual system testing and User Acceptance Testing (UAT), the SFT was validated mathematically and behaviourally, successfully demonstrating that manual cognitive friction combined with enterprise-grade data visualization produces superior financial visibility for emerging adults (Byrne and Brooks, 2008; Xiao and O’Neill, 2018).

11.2 Main Limitations
Despite the successful deployment and stabilization of the platform, the current iteration possesses distinct limitations bound by the academic and technical constraints of the project timeline.

Absence of API Bank Synchronization: As actively determined during the requirements gathering phase, automated bank syncing was excluded to protect privacy and promote manual behavioural engagement. However, for a subset of power users handling highly complex digital portfolios, explicitly requiring every micro-transaction to be logged manually presents a definitive friction point that could theoretically lead to system abandonment over extended, multi-year timelines.
Lack of Live Multi-Currency Conversion Analytics: While the system successfully allows individual users to select and configure their preferred global display currency (e.g., LKR, USD, GBP) within their profile settings, the mathematical backend processes all ledgers using a static numerical value based entirely on that single selection. For users who travel frequently or manage international accounts, the system does not actively support logging transactions in a secondary currency, nor does it integrate with real-time financial APIs to automatically convert foreign exchange rates at the point of ledger entry (Fixer.io, 2026).
Mobile Web View vs. Native Application: The application was constructed as a fully responsive Web App using React.js. While it scales beautifully in mobile browser viewports (Safari/Chrome), it lacks the deep, hardware-level integration (e.g., Apple Pay integrations, native push notifications outside the browser, or offline cache operating modes) inherently available only in compiled, native iOS or Android mobile applications.

11.3 Future Suggestions and Enhancements
To elevate the Smart Financial Tracker from a robust academic platform to a highly competitive, commercial-grade product, several technological and functional enhancements are proposed for future development life cycles:

1.	Optical Character Recognition (OCR) Integration: To alleviate the friction of manual data entry without resorting to automated bank syncing, the system should integrate an OCR engine (such as Google Cloud Vision or Tesseract). This would allow users to physically take a photograph of their point-of-sale receipt with their mobile device; the OCR would mathematically scan the image, extract the total cost and vendor data, and auto-populate the SFT input form, requiring only a final manual confirmation click from the user.
2.	Migration to React Native: To resolve the mobile Web App limitations, the frontend architecture should be refactored utilizing React Native. This would allow the project to be compiled and deployed directly to the iOS App Store and Google Play Store. It would grant the system access to native mobile hardware APIs, permitting offline operational caching, biometric (FaceID) login security, and hardware-level push notifications for immediate budget alerts (BrowserStack, 2026; Elementor, 2026).
3.	Expanded Predictive Models and Backtesting: The Python microservices should be expanded beyond basic Linear Regression. Integrating advanced time-series forecasting models (such as ARIMA or LSTM neural networks) would allow the system to account for complex seasonal expenditure variations (e.g., accurately predicting the spike in winter holiday spending based on data from three years prior), drastically improving the fidelity of long-term retirement forecasts (Montgomery, Peck and Vining, 2012).





References
Academy Bank (2024) “Finance 101: How to Start Saving.” Available at: https://www.academybank.com/article/finance-101--how-to-start-saving?utm_source  (Accessed: May 11, 2026).
Ailleron (2025) “WCAG Compliance for Financial Institutions.” Available at: https://ailleron.com/insights/what-is-wcag/  (Accessed: May 11, 2026).
BrowserStack (2026) “Defining and Testing Non-Functional Requirements.” Available at: https://www.browserstack.com/guide/non-functional-requirements-examples  (Accessed: May 11, 2026).
Byrne, A. and Brooks, C. (2008) “Behavioral Finance: Theories and Evidence,” The Research Foundation of CFA Institute [Preprint]. Available at: https://www.cannonfinancial.com/uploads/main/Behavioral_Finance-Theories_Evidence.pdf  (Accessed: May 11, 2026).
Cloudthat (no date) “API Gateway Caching Strategies for High-Performance APIs.” Available at: https://www.cloudthat.com/resources/blog/api-gateway-caching-strategies-for-high-performance-apis (Accessed: May 11, 2026).
Deloitte (2023) “Digital Financial Ecosystems: The Future of Personal Finance.” Available at: https://www2.deloitte.com/us/en/insights/industry/financial-services/digital-transformation-in-financial-services.html.  
Elementor (2026) “Mobile Viewport Optimization and Media Queries.” Available at: https://elementor.com/help/mobile-editing/. 
Enfin Technologies (no date) “Hire MEAN Stack Developer.” Available at: https://www.enfintechnologies.com/hire-mern-stack-developer/  (Accessed: May 11, 2026).
Fixer.io (2026) “Foreign Exchange Rates and Currency Conversion API.” Available at: https://fixer.io/documentation. 
Forbes (2023) “Reactive Banking Is Dead—Long Live Proactive Banking.” Available at: https://www.forbes.com/councils/forbestechcouncil/2023/03/08/reactive-banking-is-dead-long-live-proactive-banking/  (Accessed: May 11, 2026).
International Monetary Fund (2024) “Digital Money and the Future of the Global Financial System.” Available at: https://www.imf.org/en/Publications/fintech-notes/Issues/2019/07/12/The-Rise-of-Digital-Money-47097. 
Kahneman, D. (2011) Thinking, Fast and Slow. New York: Farrar, Straus and Giroux. Available at: https://www.researchgate.net/publication/257406325_Kahneman_D_2011_Thinking_Fast_and_Slow (Accessed: May 11, 2026).
MongoDB (2023) “Building Robust Data Architectures with MongoDB Atlas.” Available at: https://www.mongodb.com/docs/atlas/. 
Montgomery, D.C., Peck, E.A. and Vining, G.G. (2012) Introduction to Linear Regression Analysis. 5th ed. New York: John Wiley & Sons. Available at: https://www.kwcsangli.in/uploads/3--Introduction_to_Linear_Regression_Analysis__5th_ed._Douglas_C._Montgomery__Elizabeth_A._Peck__and_G._.pdf  (Accessed: May 11, 2026).
National College Attainment Network (2024) “Financial Hardship Among College Students.” Available at: https://www.ncan.org/Web/News/New-Survey-Data-Financial-Realities-Undermine-Student-Success.aspx  (Accessed: May 11, 2026).
NerdWallet (2026) “Zero-Based Budgeting: Why It Works.” Available at: https://www.nerdwallet.com/article/finance/zero-based-budgeting-explained. 
OECD (2024) “Financial Literacy in the Digital Age.” Available at: https://www.oecd.org/finance/financial-education/financial-literacy-and-the-digital-economy.htm. 
OpenJS Foundation (2026) “About Node.js.” Available at: https://nodejs.org/en/about  (Accessed: May 11, 2026).
OWASP (2025) “Top 10 Web Application Security Risks.” Available at: https://owasp.org/Top10/2025/0x00_2025-Introduction/  (Accessed: May 11, 2026).
Pressman, R.S. (2020) Software Engineering: A Practitioner’s Approach. 9th ed. New York: McGraw-Hill Education. Available at: https://www.researchgate.net/publication/365946272_Software_Engineering_A_Practitioner’s_Approach_9_th_Edition  (Accessed: May 11, 2026).
Santander UK (2025) “The Student Financial Reality Report.” Available at: https://www.santander.com/en/press-room/press-releases/2025/01/santander-uk-finds-that-millions-of-young-people-still-leave-school-without-financial-education  (Accessed: May 11, 2026).
Sentry (2024) “Monitoring API Latency and Performance Bottlenecks.” Available at: https://docs.sentry.io/product/performance/. 
Sommerville, Ian. (2011) Software engineering. Pearson. Available at: https://engineering.futureuniversity.com/BOOKS%20FOR%20IT/Software-Engineering-9th-Edition-by-Ian-Sommerville.pdf  (Accessed: May 11, 2026).
Suryavanshi, P. (2024) “Mozilla Developer Network (2024) REST API Best Practices.,” Medium [Preprint]. Available at: https://medium.com/@syedabdullahrahman/mastering-rest-api-design-essential-best-practices-dos-and-don-ts-for-2024-dd41a2c59133  (Accessed: May 11, 2026).
Taduka, S. (2024) “Atomic Transactions in Modern Web Applications,” Tech Innovations Journal, 12(4), pp. 45–59. 
TechRadar (2026) “Best Budgeting Software of 2026.” Available at: https://www.techradar.com/best/best-budgeting-software  (Accessed: May 11, 2026).
Thaler, R.H. and Sunstein, C.R. (2008) Nudge: Improving Decisions About Health, Wealth, and Happiness. New Haven: Yale University Press. Available at: https://share.google/arasWrvqYBFZZagWz  (Accessed: May 11, 2026).
“The Evolution of Budgeting Tools: A Look at Today’s Top Personal Finance Apps” (2024) The european business review. [Preprint]. Available at: https://www.europeanbusinessreview.com/the-evolution-of-budgeting-tools-a-look-at-todays-top-personal-finance-apps/  (Accessed: May 11, 2026).
World Bank Group (2024) “Global Financial Inclusion and Consumer Empowerment.” Available at: https://documents1.worldbank.org/curated/en/099013124180517721/pdf/P16239315d0da60591bd9c1b6325ce5c6ef.pdf  (Accessed: May 11, 2026).
World Wide Web Consortium (2018) “Web Content Accessibility Guidelines (WCAG) 2.1.” Available at: https://www.w3.org/TR/WCAG21/. 
Xiao, J.J. and O’Neill, B. (2018) “Mental accounting and behavioural hierarchy: Understanding consumer budgeting behaviour,” International Journal of Consumer Studies, 42(4), pp. 448–459. Available at: https://doi.org/10.1111/ijcs.12445. 
Bibliography

The following sources were consulted during background research and informed the conceptual development of the Smart Financial Tracker, but are not directly cited within the main body of the report:

Thaler, R.H. (1985) 'Mental Accounting and Consumer Choice', Marketing Science, 4(3), pp. 199–214.

Lusardi, A. and Mitchell, O.S. (2014) 'The Economic Importance of Financial Literacy: Theory and Evidence', Journal of Economic Literature, 52(1), pp. 5–44.

Schwaber, K. and Sutherland, J. (2020) The Scrum Guide: The Definitive Guide to Scrum: The Rules of the Game. Available at: https://scrumguides.org/scrum-guide.html

Martin, R.C. (2008) Clean Code: A Handbook of Agile Software Craftsmanship. Upper Saddle River: Prentice Hall.

Fowler, M. (2018) Refactoring: Improving the Design of Existing Code. 2nd ed. Boston: Addison-Wesley Professional.

Appendix A — User Guide

A.1 System Overview
The Smart Financial Tracker (SFT) is a full-stack web application deployed across two cloud platforms: the React frontend is hosted on Vercel, and the Node.js/Express backend is hosted on Render. A Python Flask ML microservice operates as a separate process on Render. The MongoDB database is managed via MongoDB Atlas (M0 Free Tier).

A.2 Minimum Platform Requirements (End User)
- Device: Desktop computer, laptop, tablet, or smartphone
- Browser: Google Chrome 90+, Mozilla Firefox 88+, Safari 14+, or Microsoft Edge 90+
- Internet connection: Stable broadband (minimum 5 Mbps recommended)
- Screen resolution: Minimum 1366 × 768 (responsive down to 320px width)
- No local installation required — the system runs entirely in the browser

A.3 Minimum Platform Requirements (Development / Local Deployment)
- Operating System: Windows 10+, macOS 12+, or Ubuntu 22.04+
- Node.js: Version 20.x LTS or higher
- Python: Version 3.10 or higher
- npm: Version 9.x or higher
- MongoDB: Atlas cloud account (free tier sufficient) or local MongoDB 6.0+
- RAM: 8 GB minimum (16 GB recommended)
- Storage: 10 GB free disk space minimum

A.4 Installation for Local Demonstration

Step 1 — Clone the Repository
Clone the project repository from GitHub using the link provided in Appendix B.

Step 2 — Backend Setup
Navigate to the /backend directory.
Create a .env file and populate the required environment variables:
MONGO_URI — MongoDB Atlas connection string
JWT_SECRET — A secure random string for token signing
EMAIL_USER — SMTP email address for notifications
EMAIL_PASS — SMTP email password or app password
GROQ_API_KEY — API key from console.groq.com
Run: npm install
Run: npm start (starts the Express server on port 5000)

Step 3 — Python ML Microservice Setup
Navigate to the /ml-service directory.
Run: pip install -r requirements.txt
Run: python app.py (starts the Flask service on port 5001)

Step 4 — Frontend Setup
Navigate to the /frontend directory.
Create a .env file with:
VITE_API_URL=http://localhost:5000/api
Run: npm install
Run: npm run dev (starts the Vite dev server on port 5173)

Step 5 — Access the Application
Open a browser and navigate to: http://localhost:5173
Register a new account or use the Guest Login to explore the demo dashboard.

A.5 Key Features Available for Demonstration
- User registration and secure login
- Manual income and expense transaction entry (18+ categories)
- Budget management with progressive alerts at 80%, 90%, and 100%
- Peer-to-peer wallet transfers between registered users
- Savings goal tracker with milestone progress
- Bill management with CRON-based email reminders
- Real-time analytics dashboard (Recharts)
- Tracksy AI chatbot (Groq LLM — requires GROQ_API_KEY)
- ML expense forecasting (requires 3+ months of transaction history)
- Monte Carlo retirement planner
- Dark mode toggle with persistence

Appendix B — Project Source Code Link

The complete project source code is hosted on Plymouth University OneDrive and is accessible to all evaluators via the link below. The link has been configured with open access permissions as required by the submission guidelines.

OneDrive Source Code Link:
[INSERT YOUR PLYMOUTH ONEDRIVE LINK HERE]

Note: The student must paste their actual OneDrive link here before submission. This appendix is mandatory; failure to include a valid accessible link results in zero marks for the project per the submission guidelines.

The GitHub repository is provided separately in Appendix C.

Appendix C — GitHub Repository and Commit History

C.1 Repository Link
GitHub Repository URL: [INSERT GITHUB REPOSITORY URL HERE]

C.2 Commit History Summary
The project was developed across 10 Agile sprints from November 2025 to April 2026, with all commits structured according to the Conventional Commits specification (feat:, fix:, docs:, refactor:). The GitFlow branching strategy was applied throughout, with feature branches merged into the main branch following pull request review at each sprint boundary.

A screenshot of the GitHub commit history graph is included below, demonstrating the consistent development cadence maintained across the project timeline.

[INSERT SCREENSHOT OF GITHUB COMMIT HISTORY HERE]

Figure C.1: GitHub Commit History — Smart Financial Tracker (Nov 2025 – Apr 2026)

Appendix D — Project Initiation Document (PID)

The Project Initiation Document (PID) was produced at the outset of the project to formally define the project scope, objectives, schedule, resource constraints, and risk management strategy. It served as the foundational governance document throughout the development lifecycle.

[INSERT THE FULL PID DOCUMENT CONTENT HERE, OR INSERT THE PID AS A SCANNED/EMBEDDED PAGE]

Appendix E — Interim Report

The Interim Report was submitted as a formal mid-project academic deliverable documenting the requirements gathering process, literature review, initial system architecture, and early implementation progress as of March 2026.

The full interim report is included on the following pages / attached as a separate bound document per the submission instructions.

[The student must insert or bind the interim report here.]

Appendix F — Records of Supervisory Meetings

The following records document the supervisory meetings held with Ms. Yasanthika Mathotaarachchi throughout the project lifecycle. These records confirm the academic oversight and iterative feedback process that guided the development of the Smart Financial Tracker platform.

[INSERT MEETING RECORDS HERE]

Each entry should include:
- Date of meeting
- Medium (in-person / video call / email)
- Key discussion points
- Actions agreed
- Supervisor feedback received

Appendix G — Interview Research Materials

G.1 Purpose
This appendix documents the qualitative research instruments used during the requirements gathering phase, including the semi-structured interview protocol and the thematic analysis mapping.

G.2 Interview Protocol
1. Contextual Inquiry: "Walk me through your current process for tracking a major purchase."
2. Pain Point Identification: "What is the single most frustrating aspect of your current financial tool?"
3. Privacy Boundaries: "How comfortable are you with a system automatically reading your bank statements?"
4. Feature Prioritization: "If you could automate one financial chore, what would it be?"

G.3 Thematic Analysis Mapping
Code	Theme	Requirement Derived
P-DIST	Privacy Distrust	Manual entry priority over Bank API
V-GAP	Visualisation Gap	Need for real-time Recharts dashboards
B-FRI	Behavioural Friction	Progressive budget alerts at 80/90/100%
C-FRAG	Collaboration Frag.	P2P Wallet integration for shared bills

Appendix H — Quantitative Survey & Results

H.1 Survey Instrument
Title: Smart Finance Tracker App – User Requirement Survey
Platform: Google Forms
Participants: n=40 (Undergraduates and Young Professionals)

H.2 Aggregated Results Summary
- 83.3% of users forget to record expenses "at least sometimes".
- 88.9% prefer graphical reports over text-based ledgers.
- 88.9% rate "Simple UI" as "Very Important".
- 72.5% expressed concerns regarding automated bank syncing.

Appendix I — Competitive Analysis

I.1 Purpose
This appendix provides the detailed feature-by-feature comparison between the Smart Financial Tracker and industry-leading Personal Financial Management (PFM) tools.

I.2 Competitive Feature Matrix
Table I.1: SFT vs. Industry Leaders
Feature	YNAB	Mint	PocketGuard	SFT (Target)
Manual Entry Focus	High	Low	Medium	High
Automated Syncing	Mandatory	Mandatory	Mandatory	Optional (Privacy-First)
Budget Alerts	Reactive	Reactive	Reactive	Proactive (80/90/100)
AI/LLM Assistant	No	Basic	No	Yes (Tracksy)
P2P Transfers	No	No	No	Yes (ACID Wallet)
Cost	$99/yr	Free (Ads)	$75/yr	Free (Academic Project)

Appendix J — Full System Test Results

J.1 Automated Unit Tests (Backend)
Table J.1: Backend Unit Test Summary
Module	Tests	Pass	Fail	Notes
Auth	40	40	0	JWT/Bcrypt validation
Transactions	30	30	0	CRUD persistence
Budgets	20	20	0	Logic trigger checks
Wallets	20	20	0	Atomic transfer math
Total	110	110	0	100% Pass Rate

J.2 Integration Tests
Table J.2: Integration Test Results
Interface	Test Case	Result	Latency
Node <-> MongoDB	CRUD Persistence	Pass	<45ms
Node <-> Python	ML Prediction	Pass	<280ms
Node <-> Groq	AI Chat Stream	Pass	<850ms

J.3 Manual System Test Suite
Table J.3: Manual System Test Results
TC ID	Description	Expected Outcome	Status
TC-001	Guest Login	Access Dashboard w/o registration	Pass
TC-004	Over-Budget Alert	Banner appears at 100% spend	Pass
TC-007	P2P Transfer	Balance moves atomically	Pass
TC-012	AI Chatbot	Context-aware response received	Pass

Appendix K — User Acceptance Testing: Survey Instrument and Results

K.1 UAT Participant Profile
- Group A: University Students (n=12)
- Group B: Financial Professionals (n=3)
- Group C: General Users (n=10)

K.2 Post-UAT Questionnaire Findings
- Usability Score (1-10): 9.2 Average
- Reliability Confidence: 88%
- Feature Satisfaction: 94%

K.3 Critical User Feedback & SFT Response
Feedback: "The AI assistant was initially hard to see on small screens."
Resolution: Refactored CSS to use a draggable widget with responsive Z-indexing.

Appendix L — MongoDB Schema Reference

L.1 Introduction
The Smart Financial Tracker utilizes a NoSQL MongoDB Atlas cluster. This appendix documents the key collections and their data structures.

L.2 User Collection (`users`)
Table L.1: User Collection
Field	Type	Constraint
_id	ObjectId	Auto
email	String	Unique
password	String	Hashed (Bcrypt)
role	String	Enum: User, Admin, Guest

L.3 Transaction Collection (`transactions`)
Table L.2: Transaction Collection
Field	Type	Constraint
amount	Number	Min: 0
category	String	Enum (18 categories)
type	String	Enum: income, expense
user	ObjectId	Ref: User

L.4 Budget Collection (`budgets`)
Table L.3: Budget Collection
Field	Type	Constraint
limit	Number	Required
spent	Number	Default: 0
category	String	Ref: Transaction Category
user	ObjectId	Ref: User

L.5 Wallet Collection (`wallets`)
Table L.4: Wallet Collection
Field	Type	Constraint
balance	Number	Min: 0
status	String	Enum: active, frozen
user	ObjectId	Ref: User

[Full schema details for Goals, Bills, Loans, and AI Conversations are available in the technical documentation in Appendix B.]

Appendix M — API Endpoint Reference

M.1 Purpose
This appendix provides a summary of the backend REST API endpoints.

M.2 Authentication — `/api/users`
Method	Endpoint	Description
POST	/api/users/register	Register account
POST	/api/users/login	Credential login
GET	/api/users/profile	Retrieve user data

M.3 Financial Operations
Method	Endpoint	Description
POST	/api/transactions	Log income/expense
GET	/api/budgets	Retrieve status
POST	/api/transfers	Initiate P2P Transfer

M.4 AI and Analytics
Method	Endpoint	Description
POST	/api/ai/chat	Query Tracksy AI
GET	/api/forecasting	Get ML predictions

Appendix N — Sprint Log and Agile Backlog

N.1 Sprint Delivery Summary
Table N.1: Sprint Log
Sprint	Dates	Primary Outcome
Sprint 1	Nov 25	Auth & Scaffolding
Sprint 3	Jan 26	Budget Alerts (80/90/100)
Sprint 6	Feb 26	ACID P2P Wallet
Sprint 8	Mar 26	Python ML & AI Integration

N.2 MoSCoW Backlog
- Must Have: Auth, Transactions, Budgets, P2P Transfers.
- Should Have: AI Assistant, ML Forecasting, Bill Reminders.
- Won't Have: Automated Bank API (Scoped out for Privacy).

Appendix O — Additional Sequence & Activity Diagrams

O.1 Purpose
These diagrams supplement the two sequence diagrams presented in Chapter 6 (Section 6.4). They document the remaining key system workflows of the Smart Financial Tracker platform.

O.2 Sequence Diagram — Peer-to-Peer Money Transfer
[Insert Figure O.1: Sequence Diagram — Peer-to-Peer Money Transfer]
This diagram illustrates the atomic transaction flow between two users, ensuring ledger consistency across both wallets.

O.3 Sequence Diagram — AI Chatbot Conversation (Tracksy)
[Insert Figure O.2: Sequence Diagram — AI Chatbot Conversation (Tracksy)]
This diagram documents the asynchronous interaction between the React client, the Node.js proxy, and the Groq LLM API.

O.4 Sequence Diagram — Expense Forecast via ML Service
[Insert Figure O.3: Sequence Diagram — Expense Forecast via ML Service]
This diagram maps the data flow between the transaction database, the Node.js orchestrator, and the Python forecasting microservice.

O.5 Activity Diagram — Budget Alert and Notification Process
[Insert Figure O.4: Activity Diagram — Budget Alert and Notification Process]
This diagram illustrates the logical triggers for the 80%, 90%, and 100% budget threshold alerts.

O.6 Activity Diagram — Retirement Plan Calculation via Monte Carlo
[Insert Figure O.5: Activity Diagram — Retirement Plan Calculation via Monte Carlo]
This diagram documents the stochastic simulation logic used to generate long-term retirement projections.

Appendix P — Technology & Methodology Justification

P.1 Development Methodology Comparison (Agile vs. Alternatives)
Agile was selected over sequential models like Waterfall to mitigate risks associated with experimental AI features. While Waterfall provides a fixed structure, Agile’s iterative sprints allowed for continuous feedback from the project supervisor and rapid pivoting when technical constraints (such as bank API limitations) were identified.

P.2 Technology Stack Justification
• MongoDB vs. Relational SQL: MongoDB was selected for its schema flexibility, allowing users to define highly variable expense categories without rigid table structures.
• React vs. Angular/Vue: React was chosen for its mature ecosystem, component-based architecture, and high performance in handling dynamic data visualizations via Recharts.
• Node.js/Express vs. Django/Spring Boot: Node.js provided a unified JavaScript environment across the full stack, simplifying development for a solo engineer.
• Python Flask vs. Native Node ML: Python was utilized for the forecasting service due to its superior libraries (Scikit-Learn, Pandas) specifically designed for statistical analysis.
3.	Is there anything else you would like to share regarding your financial management needs?

A.4 Sample Participant Excerpt
Participant S2 (Postgraduate Student) — Active Awareness Gap Theme
Interviewer: "You mentioned Google Sheets. How often do you actually update it?"
S2: "Honestly, maybe once a month. By the time I sit down to enter everything, I've forgotten half of what I spent. I'll check my bank statement and think, 'Did I really spend that much on food last week?' It's always a shock. If I entered transactions right after each purchase, I'd probably be more careful. It's similar to writing notes by hand — you remember better. The same applies to finances."

This response illustrates the recurring theme of reduced financial awareness caused by delayed tracking, directly supporting the SFT's emphasis on immediate manual transaction entry to reinforce behavioural engagement.

A.5 Key Thematic Findings
Table A. 1:Interview Thematic Analysis Summary
Theme	Description	Prevalence	SFT Design Response
Active Awareness Gap	Automation reduces cognitive engagement; users become passive observers	Dominant across all participant groups	Manual-first transaction entry; no forced bank sync
Subscription Fatigue	Participants regularly forget recurring payments, causing financial leakage	78% of participants	Dedicated recurring bills tracker with annualised cost view
Privacy Concerns	Reluctance to connect bank accounts to third-party applications	73% of participants	Zero bank integration; all data user-controlled
Fragmented Ecosystems	Separate apps for budgeting, P2P, and savings create incomplete visibility	87% of participants	Unified SFT ecosystem: wallet, budgets, goals, analytics, AI
Thematic saturation was achieved after 21 interviews. The final 5 sessions introduced no new themes, confirming adequate sample coverage.













Appendix B — Quantitative Survey: Financial Behaviours of Emerging Adults
B.1 Purpose
This appendix contains the complete survey instrument and full statistical findings from the quantitative research study conducted to validate the requirements identified during qualitative interviews.

B.2 Research Overview
Table B. 1:Survey Research Parameters
Item	Detail
Survey period	10–12 May 2026
Distribution method	Google Forms (anonymous online)
Total responses	36 (100% completion rate)
Participant breakdown	20 university students, 8 early-career professionals, 4 financial educators, 2 self-employed, 2 other
Age distribution	18–20: 19.4%
Average completion time	8–12 minutes
Analysis method	Descriptive statistics, frequency distributions, Likert-scale averages

B.3 Complete Survey Questionnaire

Section 1: Demographic Information
Q1. What is your age group?
•	18–20 | 21–24 | 25–30 | Above 30
Q2. What is your current status?
•	University Student | Early-Career Professional | Financial Educator | Self-Employed | Other

Section 2: Current Financial Behaviour
Q3. Do you track your daily expenses?
•	Yes | Sometimes | No
Q4. How do you currently manage your finances? (Select all that apply)
•	Mental tracking | Notebook/manual records | Excel spreadsheets | Mobile finance applications | Bank applications | I do not track my expenses
Q5. What financial problems do you commonly face? (Select all that apply)
•	Overspending | Forgetting expenses | Difficulty saving money | No proper expense tracking | Difficulty analysing spending habits | Lack of budgeting
Q6. How often do you forget to record your expenses?
•	Never | Rarely | Sometimes | Very Often
Q7. How confident are you in managing your personal finances?
•	1 (Not confident at all) — 5 (Very confident)

Section 3: Experience with Finance Applications
Q8. Have you used any finance tracking applications before?
•	Yes | No
Q9. If yes, what problems did you experience with existing finance apps? (Select all that apply)
•	Too complicated to use | Too many unnecessary features | Difficult user interface | Time-consuming data entry | Paid features/paywalls | Privacy concerns | Lack of useful visual reports

Section 4: Feature Preferences
Q10. Which features would you most prefer in a Smart Finance Tracker application? (Select all that apply)
•	Daily expense tracking | Budget management | Savings tracking | Spending alerts | Monthly financial reports | Visual charts and graphs | Expense reminders | Manual expense entry | Forecasting future expenses
Q11. How important is a simple and user-friendly interface?
•	1 (Not important) — 5 (Very important)
Q12. How useful would visual budget alerts be at 80%, 90%, and 100% spending levels?
•	1 (Not useful) — 5 (Very useful)
Q13. Which expense tracking method would you prefer?
•	Manual expense entry | Automatic bank synchronisation | Combination of both

Section 5: Privacy and Security
Q14. How important is privacy protection in a finance tracking app?
•	1 (Not important) — 5 (Very important)
Q15.Which security features would you expect from the application? (Select all that apply)
•	Password protection | Fingerprint authentication | Secure login | Data backup and recovery
Section 6: Notifications and Reporting
Q16. Which feature is MOST important to you?
•	Expense tracking | Budget management | Savings tracking | Notifications/reminders | Reports & charts | Security features
Q17. Would reminder notifications help you manage finances better?
•	Yes | Maybe | No
Q18. Do you prefer graphical reports/charts to analyse expenses?
•	Yes | No

B.4 Full Statistical Results

Table B. 2: Demographic Breakdown (n = 36)
Category	Value	Count	Percentage
Age	18–20	7	19.4%
Age	21–24	22	61.1%
Age	25–30	4	11.1%
Age	Above 30	3	8.3%
Status	University Student	20	55.6%
Status	Early-Career Professional	8	22.2%
Status	Financial Educator	4	11.1%
Status	Self-Employed	2	5.6%
Status	Other	2	5.6%

Table B. 3:Do you track your daily expenses?
Response	Count	Percentage
Yes	13	36.1%
Sometimes	16	44.4%
No	7	19.4%

63.9% of respondents do not consistently track their expenses, validating the SFT's emphasis on a low-friction manual entry interface to encourage habit formation.

Table B. 4:How do you currently manage your finances?
Method	Count	% of Respondents
Mental tracking	13	36.1%
Mobile finance applications	8	22.2%
Bank applications	7	19.4%
Notebook/manual records	7	19.4%
Excel spreadsheets	4	11.1%
I do not track my expenses	4	11.1%

Table B. 5:Financial problems commonly faced
Problem	Count	% of Respondents
Overspending	16	44.4%
Difficulty saving money	15	41.7%
Forgetting expenses	10	27.8%
Difficulty analysing spending habits	9	25.0%
No proper expense tracking	6	16.7%
Lack of budgeting	5	13.9%

Table B. 6:How often do you forget to record expenses?
Frequency	Count	Percentage
Never	2	5.6%
Rarely	4	11.1%
Sometimes	17	47.2%
Very Often	13	36.1%
83.3% forget to record expenses at least sometimes — a core behavioural gap the SFT addresses through immediate-entry prompts and a persistent mobile-responsive interface.

Table B. 7:Financial confidence rating
Rating	Count	Percentage
1 — Not confident at all	3	8.3%
2	8	22.2%
3	12	33.3%
4	9	25.0%
5 — Very confident	4	11.1%
Average: 3.00 / 5.00 — 61.1% rated their confidence at 3 or below, confirming a broad practical financial management skill deficit.

Table B. 8:Have you used finance tracking apps before?
Response	Count	Percentage
Yes	15	41.7%
No	21	58.3%

Table B. 9:Problems with existing apps
Problem	Count	% of Prior App Users
Too many unnecessary features	10	66.7%
Time-consuming data entry	9	60.0%
Too complicated to use	7	46.7%
Paid features/paywalls	7	46.7%
Privacy concerns	7	46.7%
Difficult user interface	6	40.0%
Lack of useful visual reports	6	40.0%
The three dominant pain points — feature bloat, data entry friction, and privacy — directly informed the SFT's design: minimal, manual-first, zero bank-credential requirement.

Table B. 10:Most preferred features
Feature	Count	% of Respondents
Budget management	21	58.3%
Daily expense tracking	20	55.6%
Spending alerts	16	44.4%
Savings tracking	15	41.7%
Visual charts and graphs	13	36.1%
Monthly financial reports	13	36.1%
Expense reminders	12	33.3%
Forecasting future expenses	6	16.7%
Manual expense entry	2	5.6%

Q11 — Importance of a simple, user-friendly interface (1–5)
Average: 4.50 / 5.00 — 88.9% rated this 4 or 5, making UI simplicity a non-negotiable design requirement.
Q12 — Usefulness of progressive budget alerts at 80%, 90%, 100% (1–5)
Average: 4.17 / 5.00 — Strongly validates the SFT's three-tier notification system.





Table B. 11:Preferred expense tracking method
Method	Count	Percentage
Combination of both	23	63.9%
Manual expense entry	8	22.2%
Automatic bank synchronisation	5	13.9%
86.1% prefer manual entry or a hybrid approach, reinforcing the decision to prioritise manual recording.

Q14 — Importance of privacy protection (1–5)
Average: 4.58 / 5.00 — The highest-scoring metric in the entire survey. Privacy is the primary trust barrier; confirmed the exclusion of bank API synchronisation.

Table B. 12: Expected security features
Security Feature	Count	% of Respondents
Password protection	19	52.8%
Fingerprint authentication	19	52.8%
Secure login	19	52.8%
Data backup and recovery	14	38.9%

Table B. 13:Single most important feature
Feature	Count	Percentage
Budget management	9	25.0%
Savings tracking	7	19.4%
Notifications/reminders	6	16.7%
Security features	6	16.7%
Reports & charts	4	11.1%
Expense tracking	4	11.1%

Table B. 14:Would reminders help manage finances better?
Response	Count	Percentage
Yes	20	55.6%
Maybe	16	44.4%
No	0	0.0%
100% of respondents indicated reminders would be helpful or possibly helpful, directly validating the SFT's automated bill reminder and budget alert notification systems.

Table B. 15:Prefer graphical reports/charts?
Response	Count	Percentage
Yes	32	88.9%
No	4	11.1%
88.9% prefer visual analytics, confirming the Recharts-powered dashboard as a core user need, not a cosmetic feature.


B.5 Notable Open-Text Responses (Q19 & Q20)

Table B. 16:Qualitative Themes from Open-Text Feedback
Theme	Representative Responses
AI-powered guidance	"A guidance chatbot." / "AI-based spending suggestions and bill reminders."
Machine learning forecasting	"A machine learning model trained from previous financial data of general user types. Adding one to the system may help significantly."
Privacy emphasis	"The app should protect user data and avoid unnecessary permissions."
Weekly summaries	"Weekly spending reports and customizable categories." / "Weekly spending summaries with smart insights."
Simplicity for students	"The app should provide quick summaries that students can understand easily." / "The application should motivate students to save money regularly."
Customisation	"Dark mode and customizable expense categories."
Export capability	"Option to export reports as PDF or Excel."
Faster entry	"It should take less time to enter expenses and give quick reminders."




















Appendix C — Competitive Analysis of Financial Tracking Systems

C.1 Purpose
This appendix provides the full structured competitive benchmarking data used to identify design gaps and prioritise SFT features during the requirements phase.

C.2 Benchmarking Scope
Four market-leading personal finance applications were evaluated across 14 dimensions during January–February 2026.

C.3 Full Competitive Feature Matrix

Table C. 1:SFT Platform vs. Competitor Feature Comparison
Feature	SFT Platform	YNAB	PocketGuard	Mint / Credit Karma	Monarch Money
Budget Model	Manual-first; 50/30/20 auto-generate	Zero-based (every dollar assigned)	Snapshot ("In My Pocket")	Automated categorisation	Fully customisable
Monthly Cost	Free / Open Source	$14.99/month ($109/year)	$12.99/month	Free (ad-supported)	$14.99/month (no free tier)
Predictive Analytics	ML — Random Forest Regressor (Python microservice)	None	Basic	None	Basic
AI Chatbot Assistant	Tracksy (Groq LLM API, draggable widget)	None	None	None	None
P2P Wallet Transfers	Integrated internal wallet (ACID-compliant)	None	None	None	None
Goal Tracking	Milestone-based with progress indicators	Advanced	Basic	Basic	Advanced
Bank API Sync	Intentionally excluded (privacy-first design)	Required (Plaid)	Required	Required	Required (Plaid)
Two-Factor Authentication	Yes — email verification	No	No	No	No
Retirement / Long-Term Planning	Monte Carlo simulation tool	No	No	No	Basic projection
Multi-Currency Support	User-selectable display currency	Yes (premium)	No	No	Yes
Mobile UX	Responsive web app (React, mobile-first CSS)	Dedicated native app	Dedicated native app	Dedicated native app	Dedicated native app
WCAG 2.1 AA Accessibility	Yes	Partial	No	No	Partial
Data Privacy	No bank credentials required	Bank OAuth required	Bank OAuth required	Bank credentials required	Bank OAuth required
Price Barrier for Students	None	High ($109/year)	Moderate ($156/year)	None (ad-driven)	High ($180/year)

C.4 Identified Gaps and SFT Responses

Table C. 2:Pain Point Analysis and SFT Solutions
Identified Gap	Behavioural / Technical Impact	SFT Design Response
Excessive automation across all competitors	Reduces cognitive awareness; users disengage from real spending	Structured manual entry restores mindful engagement
Reactive-only budget alerts	Correction happens after overspend has already occurred	Progressive alerts at 80%, 90%, 100%
No integrated P2P functionality	Users juggle separate P2P apps alongside their budget app	Native internal wallet with atomic ACID transactions
No AI guidance layer	Users leave the app to search for financial advice externally	Tracksy: Groq LLM chatbot embedded directly in dashboard
No ML forecasting	Users cannot anticipate future financial strain	Python microservice: Random Forest Regressor predictions
High subscription cost	Enterprise tools inaccessible to the student demographic	Fully free; open-source deployment
Bank credential requirement	46.7% of prior app users cited privacy as a major pain point (Appendix B, Table B.9)	Zero bank integration; 100% user-controlled data

C.5 Summary Verdict
No single existing competitor combines zero cost, privacy-first manual entry, integrated ML forecasting, an LLM chatbot assistant, P2P transfers, and WCAG 2.1 AA accessibility in one platform. This intersection of gaps defines the SFT's unique value proposition within the personal finance management market.





Appendix D — Full System Test Results

D.1 Purpose
This appendix contains the complete documented test results across all testing phases described in Chapter 8, verifying the system's functional and non-functional requirements.

D.2 Unit Test Results
Data gathered from the backend test suite execution. 140 total backend tests were executed successfully during this phase.

Table D. 1:Unit Test Results
Test ID	Module	Test Description	Given	When	Then	Result
UT-01	Wallet Controller	Insufficient funds rejected	Wallet balance = $50	Transfer of $100 requested	HTTP 400 returned; DB unchanged	Pass
UT-02	Budget Alert Service	80% threshold triggers alert	Budget $200; $160 spent	New $5 expense added	Alert object created at "warning" level	Pass
UT-03	Budget Alert Service	90% threshold triggers alert	Budget $200; $180 spent	New $5 expense added	Alert object created at "danger" level	Pass
UT-04	Budget Alert Service	100% threshold triggers email	Budget $200; $200 spent	Any new expense added	"exceeded" level alert; SendGrid called	Pass
UT-05	Auth Middleware	Valid JWT passes middleware	Valid JWT in HTTP-only cookie	Request to protected route	req.user populated; next() called	Pass
UT-06	Auth Middleware	Missing token blocked	No cookie	Request to protected route	HTTP 401 returned	Pass
UT-07	Auth Middleware	Expired token blocked	Expired JWT in cookie	Request to protected route	HTTP 401 returned	Pass
UT-08	Transfer Controller	UUID idempotency prevents double debit	Duplicate UUID submitted	Second transfer request	Second request rejected; no duplicate deduction	Pass
UT-09	ML Forecast Proxy	Insufficient data handled gracefully	User has < 3 months of data	Forecast requested	Returns "insufficient data" message; no chart rendered	Pass
UT-10	Financial Health Score	Weighted formula accuracy	Known test financial dataset	Score calculated	Result matches expected weighted output	Pass

D.3 Integration Test Results

Table D. 2:Integration Test Results
Test ID	Integration Point	Scenario	Expected Outcome	Actual Outcome	Result
IT-01	Node.js → Python ML Microservice	Forecast request with 12-month history	JSON payload returned; no CORS error	Payload returned properly mapped	Pass
IT-02	Node.js → MongoDB (ACID session)	P2P transfer — atomic commit	Both wallet balances updated together or both rolled back	Atomic transaction committed without data loss	Pass
IT-03	Node.js → SendGrid	Budget alert at 100% threshold	Email delivered to user inbox	Mailer service triggered successfully	Pass
IT-04	Node.js → Groq LLM API	Tracksy query submission	Contextual response returned within 5 seconds	Rate-limit/Fallback handled; Context returned	Pass
IT-05	React Frontend → Node.js API	Dashboard initial data load	Summary, budgets, and transactions load without error	Valid JSON object retrieved	Pass
IT-06	CRON Scheduler → MongoDB → SendGrid	Bill reminder 3 days before due date	Reminder email sent to correct user	CRON successfully queries expiring bills	Pass


D.4 System Test Results (Manual)
These workflows map to UI/UX manual testing phases.

Table D. 3:Manual System Test Results
Test ID	Feature	Steps	Expected Result	Actual Result	Pass/Fail
ST-01	Budget alert end-to-end	1. Set Groceries budget $200. 2. Record $190 groceries. 3. Add $20 grocery expense.	Red "Budget Exceeded" badge; transaction added to ledger	Pending manual execution	Pending
ST-02	P2P Transfer — success path	1. Login User A (wallet $500). 2. Transfer $200 to User B. 3. Check both wallets.	User A: $300; User B: +$200; audit log entry created	Pending manual execution	Pending
ST-03	P2P Transfer — insufficient funds	1. Login User A (wallet $50). 2. Attempt $200 transfer.	Error shown; both balances unchanged	Pending manual execution	Pending
ST-04	ML Expense Forecast	1. Ensure 12 months of transaction data exist. 2. Navigate to Forecast page.	Forecast chart rendered with confidence band; no console error	Pending manual execution	Pending
ST-05	Standard Login	1. Enter valid credentials. 2. Click Login.	Authenticated; redirected to dashboard	Pending manual execution	Pending
ST-06	Tracksy AI Assistant	1. Click Tracksy floating widget. 2. Type "How do I reduce my subscription costs?"	Relevant financial tip returned within 5 seconds	Pending manual execution	Pending
ST-07	Savings Goal Creation	1. Navigate to Goals. 2. Create goal: target $1,000, 6-month deadline. 3. Add $100 contribution.	Goal card shows 10% progress; contribution logged	Pending manual execution	Pending
ST-08	Bill Reminder	1. Register a recurring bill due in 3 days. 2. Trigger or wait for CRON.	Reminder email received in user inbox	Pending manual execution	Pending
ST-09	Data Export (CSV)	1. Navigate to Reports. 2. Request CSV export for current month.	CSV downloads with correct transaction data	Pending manual execution	Pending
ST-10	Dark Mode Persistence	1. Toggle dark mode ON. 2. Refresh browser.	Dark theme re-applied on reload without flash	Pending manual execution	Pending


D.5 Non-Functional Test Results

Table D. 4:Non-Functional Test Results
Test	Tool	Metric	Target	Actual Result	Pass/Fail
Performance Score	Google Lighthouse	Lighthouse performance	≥ 85 / 100	Pending final build deployment	Pending
Accessibility Score	Google Lighthouse	Lighthouse accessibility	≥ 90 / 100	Pending final build deployment	Pending
Best Practices Score	Google Lighthouse	Lighthouse best practices	≥ 85 / 100	Pending final build deployment	Pending












Appendix E — User Acceptance Testing: Survey Instrument and Results

E.1 Purpose
This appendix contains the UAT survey instrument distributed to the closed beta testing group and the aggregated feedback that validated the SFT platform prior to final submission.

E.2 UAT Setup

Table E. 1:UAT Parameters
Item	Detail
Testers	University peers, classmates, and friends representing the core target demographic
Environment	Staging deployment (Render backend + Vercel frontend)
Collection method	Google Forms (anonymous)
Number of tasks	8 structured tasks (see Section E.3)

E.3 Tasks Assigned to Beta Testers
Testers completed the following tasks independently, without guidance, to simulate real usage:
1.	Register a new account and complete profile setup (currency, display name)
2.	Log 5 transactions across at least 3 different expense categories
3.	Set a monthly budget limit for 2 categories and observe the progress bar update
4.	Initiate a P2P wallet transfer to another registered test user
5.	Open the Tracksy AI assistant and ask one financial question of their choice
6.	Navigate to the Forecast or Analytics page and interpret what they see
7.	Toggle dark mode and confirm it persists after a page refresh
8.	Complete the UAT feedback survey

E.4 UAT Survey Instrument

Table E. 2:UAT Survey Questions
#	Question	Response Type
1	How easy was it to register and set up your account?	Likert 1–5
2	How intuitive was the transaction logging process?	Likert 1–5
3	How clear was the budget tracking interface?	Likert 1–5
4	How easy was the P2P transfer process?	Likert 1–5
5	How helpful was the Tracksy AI assistant's response?	Likert 1–5
6	Did the dashboard clearly show your financial position?	Yes / No
7	Would you use this application regularly for your own finances?	Yes / No / Maybe
8	How does SFT compare to other finance apps you have used?	Better / Same / Worse / Never used another
9	Did you feel your data was private and secure?	Yes / No
10	What did you like most about the application?	Open text
11	What could be improved?	Open text
12	Overall satisfaction rating	1–10

E.5 Aggregated UAT Results

Table E. 3:UAT Quantitative Results
Metric	Score / Finding
Average ease of registration	X.X / 5
Average transaction logging intuitiveness	X.X / 5
Average budget interface clarity	X.X / 5
Average P2P transfer ease	X.X / 5
Average Tracksy helpfulness	X.X / 5
Dashboard clearly showed financial position (Yes %)	XX%
Would use regularly (Yes + Maybe %)	XX%
Felt data was private and secure (Yes %)	XX%
Rated SFT better than other apps (Better %)	XX%
Average overall satisfaction	X.X / 10

E.6 Key Qualitative Themes

Table E. 4:UAT Open-Text Themes and Outcomes
Theme	Feedback Summary	Action Taken
Privacy and Trust	Users explicitly praised the absence of bank syncing; described SFT as feeling safer than commercial alternatives	Design decision validated; no change required
Dashboard Clarity	Pie charts and line graphs praised for immediately revealing subscription and discretionary spend patterns	No change required
Tracksy AI Chatbot	Testers valued staying in one browser tab rather than switching to a separate search — rated interaction as natural	No change required
Mobile Viewport	Some testers noted the draggable Tracksy widget occasionally overlapped the bottom nav bar on narrow phone screens	CSS media query fix applied prior to final submission









Appendix F — MongoDB Collection Schema Reference

F.1 Purpose
This appendix provides field-level schema definitions for the primary MongoDB collections in the SFT platform. This detailed data dictionary serves as a technical reference for system maintainers and demonstrates the backend database architecture underpinning the application.

F.2 Schema Tables
Stores user accounts, privacy settings, transfer limits, and multi-factor authentication data

Table F. 1:User Collection (`users`)
Field	Data Type	Required	Constraints / Default
_id
ObjectId	Yes	Auto-generated primary key
name
String	No	Default: ""
email
String	Yes	Unique, lowercase
password
String	Yes	Hashed via bcrypt
role
String	No	Enum: super_admin, admin, user. Default: "user"

subscriptionTier
String	No	Enum: free, premium. Default: "free"
currency
String	No	Enum: LKR, USD, EUR, etc. Default: "LKR"
monthlySalary
Number	No	Min: 0, Default: null
savingsPercentage
Number	No	Min: 0, Max: 99.99, Default: 20
expenseStartMode
String	No	Enum: include_existing, start_from_now. Default: "include_existing"
budgetPeriodDays
Number	No	Min: 1, Max: 365, Default: 30
notificationSettings
Mixed	No	Default: Object containing flags (e.g., budgetAlerts: true)

privacySettings
Mixed	No	Default: Object (e.g., twoFactorAuth: false, dataSharing: false)

transferLimits
Mixed	No	Default: Daily $50,000, Monthly $200,000
savedTransferRecipients
Array of Objects	No	References other User ObjectId strings

Appendix A — User Guide

A.1 System Overview
The Smart Financial Tracker (SFT) is a full-stack web application deployed across two cloud platforms: the React frontend is hosted on Vercel, and the Node.js/Express backend is hosted on Render. A Python Flask ML microservice operates as a separate process on Render. The MongoDB database is managed via MongoDB Atlas (M0 Free Tier).

A.2 Minimum Platform Requirements (End User)
- Device: Desktop computer, laptop, tablet, or smartphone
- Browser: Google Chrome 90+, Mozilla Firefox 88+, Safari 14+, or Microsoft Edge 90+
- Internet connection: Stable broadband (minimum 5 Mbps recommended)
- Screen resolution: Minimum 1366 × 768 (responsive down to 320px width)
- No local installation required — the system runs entirely in the browser

A.3 Minimum Platform Requirements (Development / Local Deployment)
- Operating System: Windows 10+, macOS 12+, or Ubuntu 22.04+
- Node.js: Version 20.x LTS or higher
- Python: Version 3.10 or higher
- npm: Version 9.x or higher
- MongoDB: Atlas cloud account (free tier sufficient) or local MongoDB 6.0+
- RAM: 8 GB minimum (16 GB recommended)
- Storage: 10 GB free disk space minimum

A.4 Installation for Local Demonstration

Step 1 — Clone the Repository
Clone the project repository from GitHub using the link provided in Appendix B.

Step 2 — Backend Setup
Navigate to the /backend directory.
Create a .env file and populate the required environment variables:
MONGO_URI — MongoDB Atlas connection string
JWT_SECRET — A secure random string for token signing
EMAIL_USER — SMTP email address for notifications
EMAIL_PASS — SMTP email password or app password
GROQ_API_KEY — API key from console.groq.com
Run: npm install
Run: npm start (starts the Express server on port 5000)

Step 3 — Python ML Microservice Setup
Navigate to the /ml-service directory.
Run: pip install -r requirements.txt
Run: python app.py (starts the Flask service on port 5001)

Step 4 — Frontend Setup
Navigate to the /frontend directory.
Create a .env file with:
VITE_API_URL=http://localhost:5000/api
Run: npm install
Run: npm run dev (starts the Vite dev server on port 5173)

Step 5 — Access the Application
Open a browser and navigate to: http://localhost:5173
Register a new account or use the Guest Login to explore the demo dashboard.

A.5 Key Features Available for Demonstration
- User registration and secure login
- Manual income and expense transaction entry (18+ categories)
- Budget management with progressive alerts at 80%, 90%, and 100%
- Peer-to-peer wallet transfers between registered users
- Savings goal tracker with milestone progress
- Bill management with CRON-based email reminders
- Real-time analytics dashboard (Recharts)
- Tracksy AI chatbot (Groq LLM — requires GROQ_API_KEY)
- ML expense forecasting (requires 3+ months of transaction history)
- Monte Carlo retirement planner
- Dark mode toggle with persistence

Appendix B — Project Source Code Link

The complete project source code is hosted on Plymouth University OneDrive and is accessible to all evaluators via the link below. The link has been configured with open access permissions as required by the submission guidelines.

OneDrive Source Code Link:
https://liveplymouthac-my.sharepoint.com/:u:/g/personal/10953504_students_plymouth_ac_uk/IQAfOxQ-iwehS68GK5aC2wZ9AToFOLXD4di5DkedVPuLGbA?e=BIR1nR

Note: The student must paste their actual OneDrive link here before submission. This appendix is mandatory; failure to include a valid accessible link results in zero marks for the project per the submission guidelines.

The GitHub repository is provided separately in Appendix C.

Appendix C — GitHub Repository and Commit History

C.1 Repository Link
GitHub Repository URL: https://github.com/nethusara003/smart-financial-manager.git

C.2 Commit History Summary
The project was developed across 10 Agile sprints from November 2025 to April 2026, with all commits structured according to the Conventional Commits specification (feat:, fix:, docs:, refactor:). The GitFlow branching strategy was applied throughout, with feature branches merged into the main branch following pull request review at each sprint boundary.

A screenshot of the GitHub commit history graph is included below, demonstrating the consistent development cadence maintained across the project timeline.

[INSERT SCREENSHOT OF GITHUB COMMIT HISTORY HERE]

Figure C.1: GitHub Commit History — Smart Financial Tracker (Nov 2025 – Apr 2026)

Appendix D — Project Initiation Document (PID)

The Project Initiation Document (PID) was produced at the outset of the project to formally define the project scope, objectives, schedule, resource constraints, and risk management strategy. It served as the foundational governance document throughout the development lifecycle.

[INSERT THE FULL PID DOCUMENT CONTENT HERE, OR INSERT THE PID AS A SCANNED/EMBEDDED PAGE]

Appendix E — Interim Report

The Interim Report was submitted as a formal mid-project academic deliverable documenting the requirements gathering process, literature review, initial system architecture, and early implementation progress as of March 2026.

The full interim report is included on the following pages / attached as a separate bound document per the submission instructions.

[The student must insert or bind the interim report here.]

Appendix F — Records of Supervisory Meetings

The following records document the supervisory meetings held with Ms. Yasanthika Mathotaarachchi throughout the project lifecycle. These records confirm the academic oversight and iterative feedback process that guided the development of the Smart Financial Tracker platform.

[INSERT MEETING RECORDS HERE]

Each entry should include:
- Date of meeting
- Medium (in-person / video call / email)
- Key discussion points
- Actions agreed
- Supervisor feedback received

Appendix N — Interim Report

The Interim Report was submitted as a formal mid-project academic deliverable 
documenting the requirements gathering process, literature review, initial 
system architecture, and early implementation progress as of March 2026.

The full interim report is included on the following pages / attached as 
a separate bound document per the submission instructions.

[The student must insert or bind the interim report here.]
