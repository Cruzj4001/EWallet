package ewallet;

import java.sql.Date;

public class Income {

    private int incomeID;
    private int userID;
    private Date incomeDate;
    private String source;
    private double amount;
    private int frequency;
    private String notes;

    public Income() {
    }

    public Income(
            int incomeID,
            int userID,
            Date incomeDate,
            String source,
            double amount,
            int frequency,
            String notes) {

        this.incomeID = incomeID;
        this.userID = userID;
        this.incomeDate = incomeDate;
        this.source = source;
        this.amount = amount;
        this.frequency = frequency;
        this.notes = notes;
    }

    public int getIncomeID() {
        return incomeID;
    }

    public void setIncomeID(int incomeID) {
        this.incomeID = incomeID;
    }

    public int getUserID() {
        return userID;
    }

    public void setUserID(int userID) {
        this.userID = userID;
    }

    public Date getIncomeDate() {
        return incomeDate;
    }

    public void setIncomeDate(Date incomeDate) {
        this.incomeDate = incomeDate;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public int getFrequency() {
        return frequency;
    }

    public void setFrequency(int frequency) {
        this.frequency = frequency;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public double getYearlyAmount() {
        return amount * frequency;
    }

    @Override
    public String toString() {

        return "Income ID: " + incomeID
                + " | Date: " + incomeDate
                + " | Source: " + source
                + " | Amount: $" + String.format("%.2f", amount)
                + " | Frequency: " + frequency
                + " | Notes: " + notes;
    }
}