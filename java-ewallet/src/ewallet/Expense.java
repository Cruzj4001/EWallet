package ewallet;

import java.sql.Date;

public class Expense {

    private int expenseID;
    private int userID;
    private Date expenseDate;
    private String source;
    private double amount;
    private int frequency;
    private String category;
    private String notes;

    public Expense() {
    }

    public Expense(
            int expenseID,
            int userID,
            Date expenseDate,
            String source,
            double amount,
            int frequency,
            String category,
            String notes) {

        this.expenseID = expenseID;
        this.userID = userID;
        this.expenseDate = expenseDate;
        this.source = source;
        this.amount = amount;
        this.frequency = frequency;
        this.category = category;
        this.notes = notes;
    }

    public int getExpenseID() {
        return expenseID;
    }

    public void setExpenseID(int expenseID) {
        this.expenseID = expenseID;
    }

    public int getUserID() {
        return userID;
    }

    public void setUserID(int userID) {
        this.userID = userID;
    }

    public Date getExpenseDate() {
        return expenseDate;
    }

    public void setExpenseDate(Date expenseDate) {
        this.expenseDate = expenseDate;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
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

        return "Expense ID: " + expenseID
                + " | Date: " + expenseDate
                + " | Source: " + source
                + " | Category: " + category
                + " | Amount: $" + String.format("%.2f", amount)
                + " | Frequency: " + frequency
                + " | Notes: " + notes;
    }
}