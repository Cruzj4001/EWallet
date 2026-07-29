package ewallet;

import java.sql.Date;

public class Plan {

    private int planID;
    private int userID;
    private Date planDate;
    private String description;
    private double goalAmount;
    private double savedAmount;

    public Plan() {
    }

    public Plan(int planID, int userID, Date planDate,
                String description, double goalAmount, double savedAmount) {

        this.planID = planID;
        this.userID = userID;
        this.planDate = planDate;
        this.description = description;
        this.goalAmount = goalAmount;
        this.savedAmount = savedAmount;
    }

    public int getPlanID() {
        return planID;
    }

    public void setPlanID(int planID) {
        this.planID = planID;
    }

    public int getUserID() {
        return userID;
    }

    public void setUserID(int userID) {
        this.userID = userID;
    }

    public Date getPlanDate() {
        return planDate;
    }

    public void setPlanDate(Date planDate) {
        this.planDate = planDate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getGoalAmount() {
        return goalAmount;
    }

    public void setGoalAmount(double goalAmount) {
        this.goalAmount = goalAmount;
    }

    public double getSavedAmount() {
        return savedAmount;
    }

    public void setSavedAmount(double savedAmount) {
        this.savedAmount = savedAmount;
    }

    @Override
    public String toString() {
        return "Plan ID: " + planID
                + " | Date: " + planDate
                + " | Description: " + description
                + " | Goal: $" + String.format("%.2f", goalAmount)
                + " | Saved: $" + String.format("%.2f", savedAmount);
    }
}