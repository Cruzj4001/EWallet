package ewallet;

public class User {

    private int userID;
    private String username;
    private String passwordHash;
    private double baseBalance;
    private double baseIncome;

    public User() {}

    public User(int userID, String username, String passwordHash,
                double baseBalance, double baseIncome) {

        this.userID = userID;
        this.username = username;
        this.passwordHash = passwordHash;
        this.baseBalance = baseBalance;
        this.baseIncome = baseIncome;
    }

    public int getUserID() {
        return userID;
    }

    public void setUserID(int userID) {
        this.userID = userID;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public double getBaseBalance() {
        return baseBalance;
    }

    public void setBaseBalance(double baseBalance) {
        this.baseBalance = baseBalance;
    }

    public double getBaseIncome() {
        return baseIncome;
    }

    public void setBaseIncome(double baseIncome) {
        this.baseIncome = baseIncome;
    }

}