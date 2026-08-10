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
                "Yearly Income:          $%.2f%n",
                totalIncome
            )
        );

        report.append(
            String.format(
                "Yearly Expenses:        $%.2f%n",
                totalExpenses
            )
        );

        report.append(
            String.format(
                "Monthly Income:         $%.2f%n",
                totalIncome / 12.0
            )
        );

        report.append(
            String.format(
                "Monthly Expenses:       $%.2f%n",
                totalExpenses / 12.0
            )
        );

        if (balance >= 0) {

            report.append(
                String.format(
                    "Estimated Savings:     $%.2f%n",
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
                "Saved Toward Plans:     $%.2f%n",
                totalSaved
            )
        );

        IncomeReport incomeReport =
                new IncomeReport();

        ExpenseReport expenseReport =
                new ExpenseReport();

        report.append("\n\n");

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