package ewallet;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class AddFrequencyColumns {

    public static void main(String[] args) {

        try (
            Connection conn = Database.getConnection();
            Statement stmt = conn.createStatement()
        ) {

            try {
                stmt.executeUpdate(
                    "ALTER TABLE Income " +
                    "ADD COLUMN Frequency INT DEFAULT 1 NOT NULL"
                );

                System.out.println(
                    "Frequency column added to Income."
                );

            } catch (SQLException e) {

                System.out.println(
                    "Income Frequency column may already exist."
                );
            }

            try {
                stmt.executeUpdate(
                    "ALTER TABLE Expenses " +
                    "ADD COLUMN Frequency INT DEFAULT 1 NOT NULL"
                );

                System.out.println(
                    "Frequency column added to Expenses."
                );

            } catch (SQLException e) {

                System.out.println(
                    "Expenses Frequency column may already exist."
                );
            }

            System.out.println(
                "Database frequency migration complete."
            );

        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}