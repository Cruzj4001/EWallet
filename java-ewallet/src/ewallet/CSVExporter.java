package ewallet;

import java.io.FileWriter;
import java.io.IOException;
import java.util.List;

public class CSVExporter {

    private final IncomeDAO incomeDAO;
    private final ExpenseDAO expenseDAO;
    private final PlanDAO planDAO;

    public CSVExporter() {

        incomeDAO = new IncomeDAO();
        expenseDAO = new ExpenseDAO();
        planDAO = new PlanDAO();
    }

    public boolean exportIncome(
            int userID,
            String fileName) {

        List<Income> incomeList =
                incomeDAO.getIncomeByUser(userID);

        try (FileWriter writer =
                new FileWriter(fileName)) {

            writer.write(
                "Date,Source,Amount,Frequency,Notes\n"
            );

            for (Income income : incomeList) {

                writer.write(
                    income.getIncomeDate() + "," +
                    escapeCSV(income.getSource()) + "," +
                    income.getAmount() + "," +
                    income.getFrequency() + "," +
                    escapeCSV(income.getNotes()) +
                    "\n"
                );
            }

            return true;

        } catch (IOException e) {

            e.printStackTrace();
            return false;
        }
    }

    public boolean exportExpenses(
            int userID,
            String fileName) {

        List<Expense> expenseList =
                expenseDAO.getExpensesByUser(userID);

        try (FileWriter writer =
                new FileWriter(fileName)) {

            writer.write(
                "Date,Source,Amount,Frequency,Category,Notes\n"
            );

            for (Expense expense : expenseList) {

                writer.write(
                    expense.getExpenseDate() + "," +
                    escapeCSV(expense.getSource()) + "," +
                    expense.getAmount() + "," +
                    expense.getFrequency() + "," +
                    escapeCSV(expense.getCategory()) + "," +
                    escapeCSV(expense.getNotes()) +
                    "\n"
                );
            }

            return true;

        } catch (IOException e) {

            e.printStackTrace();
            return false;
        }
    }

    public boolean exportFullReport(
            int userID,
            String fileName) {

        double totalIncome =
                incomeDAO.getTotalIncome(userID);

        double totalExpenses =
                expenseDAO.getTotalExpenses(userID);

        double totalSaved =
                planDAO.getTotalSaved(userID);

        double savings =
                totalIncome - totalExpenses;

        try (FileWriter writer =
                new FileWriter(fileName)) {

            writer.write(
                "EWALLET FINANCIAL SUMMARY\n"
            );

            writer.write(
                "Yearly Income," +
                totalIncome +
                "\n"
            );

            writer.write(
                "Yearly Expenses," +
                totalExpenses +
                "\n"
            );

            writer.write(
                "Monthly Income," +
                (totalIncome / 12.0) +
                "\n"
            );

            writer.write(
                "Monthly Expenses," +
                (totalExpenses / 12.0) +
                "\n"
            );

            if (savings >= 0) {

                writer.write(
                    "Estimated Savings," +
                    savings +
                    "\n"
                );

            } else {

                writer.write(
                    "Total New Debt," +
                    Math.abs(savings) +
                    "\n"
                );
            }

            writer.write(
                "Saved Toward Plans," +
                totalSaved +
                "\n"
            );

            writer.write("\nINCOME\n");

            writer.write(
                "Date,Source,Amount,Frequency,Notes\n"
            );

            for (Income income :
                    incomeDAO.getIncomeByUser(userID)) {

                writer.write(
                    income.getIncomeDate() + "," +
                    escapeCSV(income.getSource()) + "," +
                    income.getAmount() + "," +
                    income.getFrequency() + "," +
                    escapeCSV(income.getNotes()) +
                    "\n"
                );
            }

            writer.write("\nEXPENSES\n");

            writer.write(
                "Date,Source,Amount,Frequency,Category,Notes\n"
            );

            for (Expense expense :
                    expenseDAO.getExpensesByUser(userID)) {

                writer.write(
                    expense.getExpenseDate() + "," +
                    escapeCSV(expense.getSource()) + "," +
                    expense.getAmount() + "," +
                    expense.getFrequency() + "," +
                    escapeCSV(expense.getCategory()) + "," +
                    escapeCSV(expense.getNotes()) +
                    "\n"
                );
            }

            return true;

        } catch (IOException e) {

            e.printStackTrace();
            return false;
        }
    }

    private String escapeCSV(String value) {

        if (value == null) {
            return "";
        }

        String escaped =
                value.replace("\"", "\"\"");

        if (
            escaped.contains(",") ||
            escaped.contains("\"") ||
            escaped.contains("\n")
        ) {

            return "\"" + escaped + "\"";
        }

        return escaped;
    }
}