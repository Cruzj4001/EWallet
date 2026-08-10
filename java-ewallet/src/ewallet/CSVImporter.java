package ewallet;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

public class CSVImporter {

    private final IncomeDAO incomeDAO;
    private final ExpenseDAO expenseDAO;

    public CSVImporter() {

        incomeDAO = new IncomeDAO();
        expenseDAO = new ExpenseDAO();
    }

    public int importIncome(
            int userID,
            String fileName) {

        int importedCount = 0;

        try (
            BufferedReader reader =
                new BufferedReader(
                    new FileReader(fileName)
                )
        ) {

            reader.readLine();

            String line;

            while ((line = reader.readLine()) != null) {

                if (line.trim().isEmpty()) {
                    continue;
                }

                List<String> values =
                        parseCSVLine(line);

                // Date,Source,Amount,Frequency,Notes

                if (values.size() < 4) {
                    continue;
                }

                try {

                    Date date =
                        Date.valueOf(values.get(0).trim());

                    String source =
                        values.get(1).trim();

                    double amount =
                        Double.parseDouble(
                            values.get(2).trim()
                        );

                    int frequency =
                        Integer.parseInt(
                            values.get(3).trim()
                        );

                    String notes =
                        values.size() >= 5
                            ? values.get(4).trim()
                            : "";

                    Income income =
                        new Income(
                            0,
                            userID,
                            date,
                            source,
                            amount,
                            frequency,
                            notes
                        );

                    if (incomeDAO.addIncome(income)) {
                        importedCount++;
                    }

                } catch (Exception e) {

                    System.out.println(
                        "Skipped invalid income row: " +
                        line
                    );
                }
            }

        } catch (IOException e) {

            e.printStackTrace();
        }

        return importedCount;
    }

    public int importExpenses(
            int userID,
            String fileName) {

        int importedCount = 0;

        try (
            BufferedReader reader =
                new BufferedReader(
                    new FileReader(fileName)
                )
        ) {

            reader.readLine();

            String line;

            while ((line = reader.readLine()) != null) {

                if (line.trim().isEmpty()) {
                    continue;
                }

                List<String> values =
                        parseCSVLine(line);

                // Date,Source,Amount,Frequency,Category,Notes

                if (values.size() < 5) {
                    continue;
                }

                try {

                    Date date =
                        Date.valueOf(values.get(0).trim());

                    String source =
                        values.get(1).trim();

                    double amount =
                        Double.parseDouble(
                            values.get(2).trim()
                        );

                    int frequency =
                        Integer.parseInt(
                            values.get(3).trim()
                        );

                    String category =
                        values.get(4).trim();

                    String notes =
                        values.size() >= 6
                            ? values.get(5).trim()
                            : "";

                    Expense expense =
                        new Expense(
                            0,
                            userID,
                            date,
                            source,
                            amount,
                            frequency,
                            category,
                            notes
                        );

                    if (expenseDAO.addExpense(expense)) {
                        importedCount++;
                    }

                } catch (Exception e) {

                    System.out.println(
                        "Skipped invalid expense row: " +
                        line
                    );
                }
            }

        } catch (IOException e) {

            e.printStackTrace();
        }

        return importedCount;
    }

    private List<String> parseCSVLine(
            String line) {

        List<String> values =
                new ArrayList<>();

        StringBuilder current =
                new StringBuilder();

        boolean insideQuotes = false;

        for (int i = 0;
             i < line.length();
             i++) {

            char c =
                line.charAt(i);

            if (c == '"') {

                if (
                    insideQuotes &&
                    i + 1 < line.length() &&
                    line.charAt(i + 1) == '"'
                ) {

                    current.append('"');
                    i++;

                } else {

                    insideQuotes =
                        !insideQuotes;
                }

            } else if (
                c == ',' &&
                !insideQuotes
            ) {

                values.add(
                    current.toString()
                );

                current.setLength(0);

            } else {

                current.append(c);
            }
        }

        values.add(
            current.toString()
        );

        return values;
    }
}