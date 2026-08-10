package ewallet;

import java.io.File;
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

    public boolean exportIncome(int userID, String fileName) {

        List<Income> incomeList =
                incomeDAO.getIncomeByUser(userID);

        try (FileWriter writer = new FileWriter(fileName)) {

            writer.write(
                "IncomeID,UserID,Date,Source,Amount,Notes\n"
            );

            for (Income income : incomeList) {

                writer.write(
                    income.getIncomeID() + "," +
                    income.getUserID() + "," +
                    income.getIncomeDate() + "," +
                    escapeCSV(income.getSource()) + "," +
                    income.getAmount() + "," +
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

    public boolean exportExpenses(int userID, String fileName) {

        List<Expense> expenseList =
                expenseDAO.getExpensesByUser(userID);

        try (FileWriter writer = new FileWriter(fileName)) {

            writer.write(
                "ExpenseID,UserID,Date,Source,Amount,Category,Notes\n"
            );

            for (Expense expense : expenseList) {

                writer.write(
                    expense.getExpenseID() + "," +
                    expense.getUserID() + "," +
                    expense.getExpenseDate() + "," +
                    escapeCSV(expense.getSource()) + "," +
                    expense.getAmount() + "," +
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

    public boolean exportPlans(int userID, String fileName) {

        List<Plan> planList =
                planDAO.getPlansByUser(userID);

        try (FileWriter writer = new FileWriter(fileName)) {

            writer.write(
                "PlanID,UserID,Date,Description,GoalAmount,SavedAmount\n"
            );

            for (Plan plan : planList) {

                writer.write(
                    plan.getPlanID() + "," +
                    plan.getUserID() + "," +
                    plan.getPlanDate() + "," +
                    escapeCSV(plan.getDescription()) + "," +
                    plan.getGoalAmount() + "," +
                    plan.getSavedAmount() +
                    "\n"
                );
            }

            return true;

        } catch (IOException e) {

            e.printStackTrace();
            return false;
        }
    }

    public boolean exportFullReport(int userID, String fileName) {

        double totalIncome =
                incomeDAO.getTotalIncome(userID);

        double totalExpenses =
                expenseDAO.getTotalExpenses(userID);

        double totalSaved =
                planDAO.getTotalSaved(userID);

        double savings =
                totalIncome - totalExpenses;

        try (FileWriter writer = new FileWriter(fileName)) {

            writer.write("EWALLET FINANCIAL SUMMARY\n");

            writer.write(
                "Total Income," +
                totalIncome +
                "\n"
            );

            writer.write(
                "Total Expenses," +
                totalExpenses +
                "\n"
            );

            if (savings >= 0) {

                writer.write(
                    "Total Savings," +
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
                "Date,Source,Amount,Notes\n"
            );

            for (Income income :
                    incomeDAO.getIncomeByUser(userID)) {

                writer.write(
                    income.getIncomeDate() + "," +
                    escapeCSV(income.getSource()) + "," +
                    income.getAmount() + "," +
                    escapeCSV(income.getNotes()) +
                    "\n"
                );
            }

            writer.write("\nEXPENSES\n");
            writer.write(
                "Date,Source,Amount,Category,Notes\n"
            );

            for (Expense expense :
                    expenseDAO.getExpensesByUser(userID)) {

                writer.write(
                    expense.getExpenseDate() + "," +
                    escapeCSV(expense.getSource()) + "," +
                    expense.getAmount() + "," +
                    escapeCSV(expense.getCategory()) + "," +
                    escapeCSV(expense.getNotes()) +
                    "\n"
                );
            }

            writer.write("\nPLANS\n");
            writer.write(
                "Date,Description,GoalAmount,SavedAmount\n"
            );

            for (Plan plan :
                    planDAO.getPlansByUser(userID)) {

                writer.write(
                    plan.getPlanDate() + "," +
                    escapeCSV(plan.getDescription()) + "," +
                    plan.getGoalAmount() + "," +
                    plan.getSavedAmount() +
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

            escaped =
                "\"" + escaped + "\"";
        }

        return escaped;
    }

    public File getExportFile(String fileName) {
        return new File(fileName);
    }
}