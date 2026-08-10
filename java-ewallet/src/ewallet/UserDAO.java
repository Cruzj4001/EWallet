package ewallet;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public class UserDAO {

    public boolean addUser(User user) {

        String sql =
            "INSERT INTO Users " +
            "(Username, PasswordHash, BaseBalance, BaseIncome) " +
            "VALUES (?, ?, ?, ?)";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setString(1, user.getUsername());
            ps.setString(2, user.getPasswordHash());
            ps.setDouble(3, user.getBaseBalance());
            ps.setDouble(4, user.getBaseIncome());

            ps.executeUpdate();

            return true;

        } catch (Exception e) {

            e.printStackTrace();
            return false;
        }
    }

    public User loginUser(
            String username,
            String passwordHash) {

        String sql =
            "SELECT * FROM Users " +
            "WHERE Username = ? AND PasswordHash = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setString(1, username);
            ps.setString(2, passwordHash);

            ResultSet rs = ps.executeQuery();

            if (rs.next()) {

                return new User(
                    rs.getInt("UserID"),
                    rs.getString("Username"),
                    rs.getString("PasswordHash"),
                    rs.getDouble("BaseBalance"),
                    rs.getDouble("BaseIncome")
                );
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return null;
    }

    public User getUserByUsername(String username) {

        String sql =
            "SELECT * FROM Users WHERE Username = ?";

        try (
            Connection conn = Database.getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)
        ) {

            ps.setString(1, username);

            ResultSet rs = ps.executeQuery();

            if (rs.next()) {

                return new User(
                    rs.getInt("UserID"),
                    rs.getString("Username"),
                    rs.getString("PasswordHash"),
                    rs.getDouble("BaseBalance"),
                    rs.getDouble("BaseIncome")
                );
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return null;
    }
}