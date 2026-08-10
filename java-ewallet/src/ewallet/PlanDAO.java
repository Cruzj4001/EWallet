package ewallet;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

public class PlanDAO {

    public boolean addPlan(Plan plan) {

        String sql =
            "INSERT INTO Plans " +
            "(UserID, PlanDate, Description, GoalAmount, SavedAmount) " +
            "VALUES (?, ?, ?, ?, ?)";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, plan.getUserID());
            ps.setDate(2, plan.getPlanDate());
            ps.setString(3, plan.getDescription());
            ps.setDouble(4, plan.getGoalAmount());
            ps.setDouble(5, plan.getSavedAmount());

            ps.executeUpdate();

            return true;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<Plan> getPlansByUser(int userID) {

        List<Plan> plans = new ArrayList<>();

        String sql =
            "SELECT * FROM Plans " +
            "WHERE UserID = ? " +
            "ORDER BY PlanDate";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, userID);

            ResultSet rs = ps.executeQuery();

            while (rs.next()) {

                Plan plan = new Plan(
                    rs.getInt("PlanID"),
                    rs.getInt("UserID"),
                    rs.getDate("PlanDate"),
                    rs.getString("Description"),
                    rs.getDouble("GoalAmount"),
                    rs.getDouble("SavedAmount")
                );

                plans.add(plan);
            }

            rs.close();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return plans;
    }

    public boolean updatePlan(Plan plan) {

        String sql =
            "UPDATE Plans SET " +
            "PlanDate = ?, " +
            "Description = ?, " +
            "GoalAmount = ?, " +
            "SavedAmount = ? " +
            "WHERE PlanID = ? AND UserID = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setDate(1, plan.getPlanDate());
            ps.setString(2, plan.getDescription());
            ps.setDouble(3, plan.getGoalAmount());
            ps.setDouble(4, plan.getSavedAmount());
            ps.setInt(5, plan.getPlanID());
            ps.setInt(6, plan.getUserID());

            int rows = ps.executeUpdate();

            return rows > 0;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deletePlan(int planID, int userID) {

        String sql =
            "DELETE FROM Plans " +
            "WHERE PlanID = ? AND UserID = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, planID);
            ps.setInt(2, userID);

            int rows = ps.executeUpdate();

            return rows > 0;

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public double getTotalSaved(int userID) {

        String sql =
            "SELECT SUM(SavedAmount) AS Total " +
            "FROM Plans WHERE UserID = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setInt(1, userID);

            ResultSet rs = ps.executeQuery();

            if (rs.next()) {
                return rs.getDouble("Total");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return 0.0;
    }
}