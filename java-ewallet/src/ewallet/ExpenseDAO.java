package ewallet;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class ExpenseDAO {

    public boolean addExpense(Expense expense) {

        String sql =
            "INSERT INTO Expenses " +
            "(UserID, ExpenseDate, Source, Amount, Frequency, Category, Notes) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, expense.getUserID());
            ps.setDate(2, expense.getExpenseDate());
            ps.setString(3, expense.getSource());
            ps.setDouble(4, expense.getAmount());
            ps.setInt(5, expense.getFrequency());
            ps.setString(6, expense.getCategory());
            ps.setString(7, expense.getNotes());

            ps.executeUpdate();

            return true;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<Expense> getExpensesByUser(
            int userID) {

        List<Expense> expenses =
            new ArrayList<>();

        String sql =
            "SELECT * FROM Expenses " +
            "WHERE UserID = ? " +
            "ORDER BY ExpenseDate";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, userID);

            ResultSet rs =
                ps.executeQuery();

            while (rs.next()) {

                Expense expense =
                    new Expense(
                        rs.getInt("ExpenseID"),
                        rs.getInt("UserID"),
                        rs.getDate("ExpenseDate"),
                        rs.getString("Source"),
                        rs.getDouble("Amount"),
                        rs.getInt("Frequency"),
                        rs.getString("Category"),
                        rs.getString("Notes")
                    );

                expenses.add(expense);
            }

            rs.close();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return expenses;
    }

    public boolean updateExpense(
            Expense expense) {

        String sql =
            "UPDATE Expenses SET " +
            "ExpenseDate = ?, " +
            "Source = ?, " +
            "Amount = ?, " +
            "Frequency = ?, " +
            "Category = ?, " +
            "Notes = ? " +
            "WHERE ExpenseID = ? AND UserID = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setDate(1, expense.getExpenseDate());
            ps.setString(2, expense.getSource());
            ps.setDouble(3, expense.getAmount());
            ps.setInt(4, expense.getFrequency());
            ps.setString(5, expense.getCategory());
            ps.setString(6, expense.getNotes());

            ps.setInt(7, expense.getExpenseID());
            ps.setInt(8, expense.getUserID());

            return ps.executeUpdate() > 0;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteExpense(
            int expenseID,
            int userID) {

        String sql =
            "DELETE FROM Expenses " +
            "WHERE ExpenseID = ? AND UserID = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, expenseID);
            ps.setInt(2, userID);

            return ps.executeUpdate() > 0;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public double getTotalExpenses(int userID) {

        String sql =
            "SELECT SUM(Amount * Frequency) AS Total " +
            "FROM Expenses WHERE UserID = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, userID);

            ResultSet rs =
                ps.executeQuery();

            if (rs.next()) {
                return rs.getDouble("Total");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return 0.0;
    }
}