package ewallet;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class IncomeDAO {

    public boolean addIncome(Income income) {

        String sql =
            "INSERT INTO Income " +
            "(UserID, IncomeDate, Source, Amount, Frequency, Notes) " +
            "VALUES (?, ?, ?, ?, ?, ?)";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, income.getUserID());
            ps.setDate(2, income.getIncomeDate());
            ps.setString(3, income.getSource());
            ps.setDouble(4, income.getAmount());
            ps.setInt(5, income.getFrequency());
            ps.setString(6, income.getNotes());

            ps.executeUpdate();

            return true;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<Income> getIncomeByUser(int userID) {

        List<Income> incomeList =
            new ArrayList<>();

        String sql =
            "SELECT * FROM Income " +
            "WHERE UserID = ? " +
            "ORDER BY IncomeDate";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, userID);

            ResultSet rs =
                ps.executeQuery();

            while (rs.next()) {

                Income income =
                    new Income(
                        rs.getInt("IncomeID"),
                        rs.getInt("UserID"),
                        rs.getDate("IncomeDate"),
                        rs.getString("Source"),
                        rs.getDouble("Amount"),
                        rs.getInt("Frequency"),
                        rs.getString("Notes")
                    );

                incomeList.add(income);
            }

            rs.close();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return incomeList;
    }

    public boolean updateIncome(Income income) {

        String sql =
            "UPDATE Income SET " +
            "IncomeDate = ?, " +
            "Source = ?, " +
            "Amount = ?, " +
            "Frequency = ?, " +
            "Notes = ? " +
            "WHERE IncomeID = ? AND UserID = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setDate(1, income.getIncomeDate());
            ps.setString(2, income.getSource());
            ps.setDouble(3, income.getAmount());
            ps.setInt(4, income.getFrequency());
            ps.setString(5, income.getNotes());

            ps.setInt(6, income.getIncomeID());
            ps.setInt(7, income.getUserID());

            return ps.executeUpdate() > 0;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteIncome(
            int incomeID,
            int userID) {

        String sql =
            "DELETE FROM Income " +
            "WHERE IncomeID = ? AND UserID = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, incomeID);
            ps.setInt(2, userID);

            return ps.executeUpdate() > 0;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public double getTotalIncome(int userID) {

        String sql =
            "SELECT SUM(Amount * Frequency) AS Total " +
            "FROM Income WHERE UserID = ?";

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