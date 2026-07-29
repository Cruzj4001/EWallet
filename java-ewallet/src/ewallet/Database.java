package ewallet;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class Database {

    private static final String URL =
            "jdbc:derby:EWalletDatabase";

    public static Connection getConnection() {

        try {
            return DriverManager.getConnection(URL);

        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
    }
}