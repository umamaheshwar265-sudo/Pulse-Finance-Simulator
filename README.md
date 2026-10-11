# PULSE Finance Simulator

**Personal finance. Smarter decisions.**

PULSE is a responsive, frontend-only personal finance simulator that helps users understand how to manage a ₹10,000 budget over a 30-day period. Users can track expenses, manage upcoming bills, explore savings goals, and simulate spending decisions.

## Features

- **Budget Overview:** Track total budget, spending, and remaining balance.
- **Expense Tracking:** Add expenses with names, amounts, and categories.
- **Spending Breakdown:** View spending grouped by category.
- **Financial Forecast:** Explore projected balances and future spending.
- **Bill Management:** Track recurring commitments and payment status.
- **Savings Goals:** Monitor savings and target amounts.
- **Purchase Simulation:** Evaluate spending decisions before applying them.
- **Personalization:** Switch between dark and light themes and choose from six accent colors.
- **Local Persistence:** Save financial simulation data in browser local storage.
- **Responsive Interface:** Designed to adapt to different screen sizes.

## Technology Stack

- React
- JavaScript (ES Modules)
- Vite
- CSS
- Browser Local Storage

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/umamaheshwar265-sudo/Pulse-Finance-Simulator.git
cd Pulse-Finance-Simulator
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run the available lint checks:

```bash
npm run lint
```

## Architecture

The application uses React for its interface and component-based rendering. CSS manages visual styling and responsive layouts. React state manages interactive financial data, while browser local storage preserves the simulation across page refreshes.

The application is frontend-only and uses simulated financial data. It does not connect to bank accounts or provide financial advice.

## Data and Privacy

Simulation data is stored locally in the user's browser. Clearing browser storage may remove saved progress. This project does not implement a backend or cloud synchronization.

## Live Demo

https://pulse-finance-simulator.vercel.app

## Project Repository

https://github.com/umamaheshwar265-sudo/Pulse-Finance-Simulator

## License

Add a license file if this project is intended to be distributed as open-source software.
