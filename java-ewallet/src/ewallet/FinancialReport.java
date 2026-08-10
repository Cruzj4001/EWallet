package ewallet;

public class FinancialReport {

    private final IncomeDAO incomeDAO;
    private final ExpenseDAO expenseDAO;
    private final PlanDAO planDAO;

    public FinancialReport() {

        incomeDAO = new IncomeDAO();
        expenseDAO = new ExpenseDAO();
        planDAO = new PlanDAO();
    }

    public String generateReport(int userID) {

        double totalIncome =
                incomeDAO.getTotalIncome(userID);

        double totalExpenses =
                expenseDAO.getTotalExpenses(userID);

        double totalSaved =
                planDAO.getTotalSaved(userID);

        double balance =
                totalIncome - totalExpenses;

        StringBuilder report =
                new StringBuilder();

        report.append("========================================\n");
        report.append("         EWALLET FINANCIAL REPORT\n");
        report.append("========================================\n\n");

        report.append(
            String.format(
                "Total Income:          $%.2f%n",
                totalIncome
            )
        );

        report.append(
            String.format(
                "Total Expenses:        $%.2f%n",
                totalExpenses
            )
        );

        if (balance >= 0) {

            report.append(
                String.format(
                    "Total Savings:         $%.2f%n",
                    balance
                )
            );

        } else {

            report.append(
                String.format(
                    "Total New Debt:        $%.2f%n",
                    Math.abs(balance)
                )
            );
        }

        report.append(
            String.format(
                "Saved Toward Plans:    $%.2f%n",
                totalSaved
            )
        );

        report.append("\n");

        IncomeReport incomeReport =
                new IncomeReport();

        ExpenseReport expenseReport =
                new ExpenseReport();

        report.append(
            incomeReport.generateReport(userID)
        );

        report.append("\n\n");

        report.append(
            expenseReport.generateReport(userID)
        );

        return report.toString();
    }
}