package ewallet;

import java.sql.Connection;
import java.sql.PreparedStatement;

public class UserDAO {

    public boolean addUser(User user) {

        String sql =
                "INSERT INTO Users (Username, PasswordHash, BaseBalance, BaseIncome) VALUES (?, ?, ?, ?)";

        try {

            Connection conn = Database.getConnection();

            PreparedStatement ps = conn.prepareStatement(sql);

            ps.setString(1, user.getUsername());
            ps.setString(2, user.getPasswordHash());
            ps.setDouble(3, user.getBaseBalance());
            ps.setDouble(4, user.getBaseIncome());

            ps.executeUpdate();

            ps.close();
            conn.close();

            return true;

        } catch (Exception e) {

            e.printStackTrace();
            return false;

        }

    }

}