package ewallet;

import java.util.List;

public class IncomeReport {

    private final IncomeDAO incomeDAO;

    public IncomeReport() {
        incomeDAO = new IncomeDAO();
    }

    public String generateReport(int userID) {

        List<Income> incomeList =
                incomeDAO.getIncomeByUser(userID);

        double totalIncome =
                incomeDAO.getTotalIncome(userID);

        StringBuilder report = new StringBuilder();

        report.append("========================================\n");
        report.append("             INCOME REPORT\n");
        report.append("========================================\n\n");

        if (incomeList.isEmpty()) {

            report.append("No income records found.\n");

        } else {

            for (Income income : incomeList) {

                report.append("Date: ")
                      .append(income.getIncomeDate())
                      .append("\n");

                report.append("Source: ")
                      .append(income.getSource())
                      .append("\n");

                report.append(
                    String.format(
                        "Amount: $%.2f%n",
                        income.getAmount()
                    )
                );

                report.append("Notes: ")
                      .append(income.getNotes())
                      .append("\n");

                report.append(
                    "----------------------------------------\n"
                );
            }
        }

        report.append("\n");

        report.append(
            String.format(
                "Total Income: $%.2f%n",
                totalIncome
            )
        );

        return report.toString();
    }
}