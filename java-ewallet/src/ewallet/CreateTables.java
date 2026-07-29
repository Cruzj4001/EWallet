package ewallet;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class CreateTables {

    public static void main(String[] args) {

        Connection conn = Database.getConnection();

        if (conn == null) {
            System.out.println("Database connection failed.");
            return;
        }

        try {

            Statement stmt = conn.createStatement();

            createUsers(stmt);
            createExpenses(stmt);
            createIncome(stmt);
            createPlans(stmt);

            stmt.close();
            conn.close();

            System.out.println("Database setup complete!");

        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private static void createUsers(Statement stmt) {

        try {

            stmt.executeUpdate(
                    "CREATE TABLE Users (" +
                    "UserID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY," +
                    "Username VARCHAR(50) UNIQUE NOT NULL," +
                    "PasswordHash VARCHAR(64) NOT NULL," +
                    "BaseBalance DECIMAL(10,2)," +
                    "BaseIncome DECIMAL(10,2))");

            System.out.println("Users table created.");

        } catch (SQLException e) {

            System.out.println("Users table already exists.");

        }

    }

    private static void createExpenses(Statement stmt) {

        try {

            stmt.executeUpdate(
                    "CREATE TABLE Expenses (" +
                    "ExpenseID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY," +
                    "UserID INT NOT NULL," +
                    "ExpenseDate DATE," +
                    "Source VARCHAR(100)," +
                    "Amount DECIMAL(10,2)," +
                    "Category VARCHAR(50)," +
                    "Notes VARCHAR(255)," +
                    "FOREIGN KEY (UserID) REFERENCES Users(UserID))");

            System.out.println("Expenses table created.");

        } catch (SQLException e) {

            System.out.println("Expenses table already exists.");

        }

    }

    private static void createIncome(Statement stmt) {

        try {

            stmt.executeUpdate(
                    "CREATE TABLE Income (" +
                    "IncomeID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY," +
                    "UserID INT NOT NULL," +
                    "IncomeDate DATE," +
                    "Source VARCHAR(100)," +
                    "Amount DECIMAL(10,2)," +
                    "Notes VARCHAR(255)," +
                    "FOREIGN KEY (UserID) REFERENCES Users(UserID))");

            System.out.println("Income table created.");

        } catch (SQLException e) {

            System.out.println("Income table already exists.");

        }

    }

    private static void createPlans(Statement stmt) {

        try {

            stmt.executeUpdate(
                    "CREATE TABLE Plans (" +
                    "PlanID INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY," +
                    "UserID INT NOT NULL," +
                    "PlanDate DATE," +
                    "Description VARCHAR(255)," +
                    "GoalAmount DECIMAL(10,2)," +
                    "SavedAmount DECIMAL(10,2)," +
                    "FOREIGN KEY (UserID) REFERENCES Users(UserID))");

            System.out.println("Plans table created.");

        } catch (SQLException e) {

            System.out.println("Plans table already exists.");

        }

    }

}