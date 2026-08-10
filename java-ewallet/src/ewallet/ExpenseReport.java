package ewallet;

import java.util.List;

public class ExpenseReport {

    private final ExpenseDAO expenseDAO;

    public ExpenseReport() {
        expenseDAO = new ExpenseDAO();
    }

    public String generateReport(int userID) {

        List<Expense> expenseList =
                expenseDAO.getExpensesByUser(userID);

        double totalExpenses =
                expenseDAO.getTotalExpenses(userID);

        StringBuilder report = new StringBuilder();

        report.append("========================================\n");
        report.append("            EXPENSE REPORT\n");
        report.append("========================================\n\n");

        if (expenseList.isEmpty()) {

            report.append("No expense records found.\n");

        } else {

            for (Expense expense : expenseList) {

                report.append("Date: ")
                      .append(expense.getExpenseDate())
                      .append("\n");

                report.append("Source: ")
                      .append(expense.getSource())
                      .append("\n");

                report.append("Category: ")
                      .append(expense.getCategory())
                      .append("\n");

                report.append(
                    String.format(
                        "Amount: $%.2f%n",
                        expense.getAmount()
                    )
                );

                report.append("Frequency: ")
                      .append(getFrequencyLabel(
                          expense.getFrequency()
                      ))
                      .append("\n");

                report.append(
                    String.format(
                        "Yearly Equivalent: $%.2f%n",
                        expense.getYearlyAmount()
                    )
                );

                report.append("Notes: ")
                      .append(expense.getNotes())
                      .append("\n");

                report.append(
                    "----------------------------------------\n"
                );
            }
        }

        report.append("\n");

        report.append(
            String.format(
                "Total Yearly Expenses: $%.2f%n",
                totalExpenses
            )
        );

        return report.toString();
    }

    private String getFrequencyLabel(int frequency) {

        return switch (frequency) {
            case 12 -> "Monthly";
            case 24 -> "Twice Monthly";
            case 26 -> "Biweekly";
            case 52 -> "Weekly";
            default -> "One Time or Yearly";
        };
    }
}