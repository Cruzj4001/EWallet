package ewallet;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EWalletServer {

    private static final int PORT = 8081;

    private static final Path WEB_ROOT =
            Path.of("..").toAbsolutePath().normalize();


    // ==================================================
    // MAIN
    // ==================================================

    public static void main(String[] args) {

        try {

            HttpServer server =
                    HttpServer.create(
                            new InetSocketAddress(PORT),
                            0
                    );


            // Health
            server.createContext(
                    "/api/health",
                    EWalletServer::handleHealth
            );


            // Authentication
            server.createContext(
                    "/api/auth",
                    EWalletServer::handleAuth
            );


            // Income CRUD
            server.createContext(
                    "/api/income",
                    EWalletServer::handleIncome
            );


            // Expense CRUD
            server.createContext(
                    "/api/expenses",
                    EWalletServer::handleExpenses
            );


            // Planning CRUD
            server.createContext(
                    "/api/plans",
                    EWalletServer::handlePlans
            );


            // Reports
            server.createContext(
                    "/api/report/income",
                    EWalletServer::handleIncomeReport
            );

            server.createContext(
                    "/api/report/expenses",
                    EWalletServer::handleExpenseReport
            );

            server.createContext(
                    "/api/report/full",
                    EWalletServer::handleFullReport
            );


            // CSV Export
            server.createContext(
                    "/api/export/income",
                    EWalletServer::handleIncomeExport
            );

            server.createContext(
                    "/api/export/expenses",
                    EWalletServer::handleExpenseExport
            );

            server.createContext(
                    "/api/export/full",
                    EWalletServer::handleFullExport
            );


            // CSV Import
            server.createContext(
                    "/api/import/income",
                    EWalletServer::handleIncomeImport
            );

            server.createContext(
                    "/api/import/expenses",
                    EWalletServer::handleExpenseImport
            );


            // Original HTML GUI
            server.createContext(
                    "/",
                    EWalletServer::handleStaticFile
            );


            server.start();


            System.out.println(
                    "======================================"
            );

            System.out.println(
                    "EWallet backend is running!"
            );

            System.out.println(
                    "http://localhost:" + PORT
            );

            System.out.println();

            System.out.println(
                    "Health check:"
            );

            System.out.println(
                    "http://localhost:"
                            + PORT
                            + "/api/health"
            );

            System.out.println();

            System.out.println(
                    "Serving GUI files from:"
            );

            System.out.println(
                    WEB_ROOT
            );

            System.out.println(
                    "======================================"
            );


        } catch (IOException e) {

            e.printStackTrace();
        }
    }


    // ==================================================
    // HEALTH
    // ==================================================

    private static void handleHealth(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }

        sendJson(
                exchange,
                200,
                "{\"status\":\"ok\"}"
        );
    }


    // ==================================================
    // AUTHENTICATION
    // ==================================================

    private static void handleAuth(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        if (!exchange
                .getRequestMethod()
                .equalsIgnoreCase("POST")) {

            sendJson(
                    exchange,
                    405,
                    "{\"success\":false,"
                            + "\"message\":\"POST required\"}"
            );

            return;
        }


        Map<String, String> form =
                readForm(exchange);


        String mode =
                form.getOrDefault(
                        "mode",
                        "login"
                ).trim();


        String username =
                form.getOrDefault(
                        "username",
                        ""
                ).trim();


        String passwordHash =
                form.getOrDefault(
                        "passwordHash",
                        ""
                ).trim();


        double baseBalance =
                parseDouble(
                        form.get("baseBalance"),
                        500.00
                );


        double baseIncome =
                parseDouble(
                        form.get("baseIncome"),
                        50.00
                );


        if (
                username.isEmpty()
                        || passwordHash.isEmpty()
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Username and password are required.\"}"
            );

            return;
        }


        UserDAO dao =
                new UserDAO();


        User existing =
                dao.getUserByUsername(
                        username
                );


        // LOGIN
        if (
                mode.equalsIgnoreCase(
                        "login"
                )
        ) {

            if (existing == null) {

                sendJson(
                        exchange,
                        404,
                        "{\"success\":false,"
                                + "\"message\":\"Account not found.\"}"
                );

                return;
            }


            User loggedIn =
                    dao.loginUser(
                            username,
                            passwordHash
                    );


            if (loggedIn == null) {

                sendJson(
                        exchange,
                        401,
                        "{\"success\":false,"
                                + "\"message\":\"Invalid username or password.\"}"
                );

                return;
            }


            sendUserResponse(
                    exchange,
                    loggedIn,
                    false
            );

            return;
        }


        // CREATE ACCOUNT
        if (
                mode.equalsIgnoreCase(
                        "create"
                )
        ) {

            if (existing != null) {

                sendJson(
                        exchange,
                        409,
                        "{\"success\":false,"
                                + "\"message\":\"That username already exists.\"}"
                );

                return;
            }


            User newUser =
                    new User(
                            0,
                            username,
                            passwordHash,
                            baseBalance,
                            baseIncome
                    );


            boolean created =
                    dao.addUser(
                            newUser
                    );


            if (!created) {

                sendJson(
                        exchange,
                        500,
                        "{\"success\":false,"
                                + "\"message\":\"Account could not be created.\"}"
                );

                return;
            }


            User createdUser =
                    dao.getUserByUsername(
                            username
                    );


            if (createdUser == null) {

                sendJson(
                        exchange,
                        500,
                        "{\"success\":false,"
                                + "\"message\":\"Account could not be loaded.\"}"
                );

                return;
            }


            sendUserResponse(
                    exchange,
                    createdUser,
                    true
            );

            return;
        }


        sendJson(
                exchange,
                400,
                "{\"success\":false,"
                        + "\"message\":\"Invalid authentication mode.\"}"
        );
    }


    private static void sendUserResponse(
            HttpExchange exchange,
            User user,
            boolean created)
            throws IOException {

        String json =
                "{"
                        + "\"success\":true,"
                        + "\"created\":"
                        + created
                        + ","
                        + "\"user\":{"
                        + "\"userID\":"
                        + user.getUserID()
                        + ","
                        + "\"username\":\""
                        + escapeJson(
                                user.getUsername()
                        )
                        + "\","
                        + "\"baseBalance\":"
                        + user.getBaseBalance()
                        + ","
                        + "\"baseIncome\":"
                        + user.getBaseIncome()
                        + "}"
                        + "}";


        sendJson(
                exchange,
                200,
                json
        );
    }


    // ==================================================
    // INCOME CRUD
    // ==================================================

    private static void handleIncome(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        String method =
                exchange
                        .getRequestMethod()
                        .toUpperCase();


        switch (method) {

            case "GET" ->
                    getIncome(exchange);

            case "POST" ->
                    addIncome(exchange);

            case "PUT" ->
                    updateIncome(exchange);

            case "DELETE" ->
                    deleteIncome(exchange);

            default ->
                    sendJson(
                            exchange,
                            405,
                            "{\"success\":false,"
                                    + "\"message\":\"Unsupported request method.\"}"
                    );
        }
    }


    private static void getIncome(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> query =
                parseQuery(exchange);


        int userID =
                parseInt(
                        query.get("userID"),
                        -1
                );


        if (userID <= 0) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Valid userID required.\"}"
            );

            return;
        }


        IncomeDAO dao =
                new IncomeDAO();


        List<Income> incomeList =
                dao.getIncomeByUser(
                        userID
                );


        StringBuilder json =
                new StringBuilder();


        json.append(
                "{\"success\":true,\"income\":["
        );


        for (
                int i = 0;
                i < incomeList.size();
                i++
        ) {

            Income income =
                    incomeList.get(i);


            if (i > 0) {
                json.append(",");
            }


            json.append("{");

            json.append(
                    "\"incomeID\":"
            );

            json.append(
                    income.getIncomeID()
            );

            json.append(
                    ",\"userID\":"
            );

            json.append(
                    income.getUserID()
            );

            json.append(
                    ",\"date\":\""
            );

            json.append(
                    income.getIncomeDate()
            );

            json.append("\"");

            json.append(
                    ",\"source\":\""
            );

            json.append(
                    escapeJson(
                            income.getSource()
                    )
            );

            json.append("\"");

            json.append(
                    ",\"amount\":"
            );

            json.append(
                    income.getAmount()
            );

            json.append(
                    ",\"frequency\":"
            );

            json.append(
                    income.getFrequency()
            );

            json.append(
                    ",\"notes\":\""
            );

            json.append(
                    escapeJson(
                            income.getNotes()
                    )
            );

            json.append("\"");

            json.append("}");
        }


        json.append("]}");


        sendJson(
                exchange,
                200,
                json.toString()
        );
    }


    private static void addIncome(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> form =
                readForm(exchange);


        int userID =
                parseInt(
                        form.get("userID"),
                        -1
                );


        String date =
                form.getOrDefault(
                        "date",
                        ""
                );


        String source =
                form.getOrDefault(
                        "source",
                        ""
                ).trim();


        double amount =
                parseDouble(
                        form.get("amount"),
                        -1
                );


        int frequency =
                parseInt(
                        form.get("frequency"),
                        1
                );


        String notes =
                form.getOrDefault(
                        "notes",
                        ""
                );


        if (
                userID <= 0
                        || date.isBlank()
                        || source.isBlank()
                        || amount < 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid income information.\"}"
            );

            return;
        }


        try {

            Income income =
                    new Income(
                            0,
                            userID,
                            Date.valueOf(date),
                            source,
                            amount,
                            frequency,
                            notes
                    );


            IncomeDAO dao =
                    new IncomeDAO();


            boolean success =
                    dao.addIncome(
                            income
                    );


            if (!success) {

                sendJson(
                        exchange,
                        500,
                        "{\"success\":false,"
                                + "\"message\":\"Income could not be added.\"}"
                );

                return;
            }


            sendJson(
                    exchange,
                    200,
                    "{\"success\":true,"
                            + "\"message\":\"Income added successfully.\"}"
            );


        } catch (Exception e) {

            e.printStackTrace();


            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid income date or values.\"}"
            );
        }
    }


    private static void updateIncome(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> form =
                readForm(exchange);


        int incomeID =
                parseInt(
                        form.get("incomeID"),
                        -1
                );


        int userID =
                parseInt(
                        form.get("userID"),
                        -1
                );


        String date =
                form.getOrDefault(
                        "date",
                        ""
                );


        String source =
                form.getOrDefault(
                        "source",
                        ""
                ).trim();


        double amount =
                parseDouble(
                        form.get("amount"),
                        -1
                );


        int frequency =
                parseInt(
                        form.get("frequency"),
                        1
                );


        String notes =
                form.getOrDefault(
                        "notes",
                        ""
                );


        if (
                incomeID <= 0
                        || userID <= 0
                        || date.isBlank()
                        || source.isBlank()
                        || amount < 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid income information.\"}"
            );

            return;
        }


        try {

            Income income =
                    new Income(
                            incomeID,
                            userID,
                            Date.valueOf(date),
                            source,
                            amount,
                            frequency,
                            notes
                    );


            IncomeDAO dao =
                    new IncomeDAO();


            boolean success =
                    dao.updateIncome(
                            income
                    );


            if (!success) {

                sendJson(
                        exchange,
                        404,
                        "{\"success\":false,"
                                + "\"message\":\"Income record was not found.\"}"
                );

                return;
            }


            sendJson(
                    exchange,
                    200,
                    "{\"success\":true,"
                            + "\"message\":\"Income updated successfully.\"}"
            );


        } catch (Exception e) {

            e.printStackTrace();


            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid income values.\"}"
            );
        }
    }


    private static void deleteIncome(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> query =
                parseQuery(exchange);


        int incomeID =
                parseInt(
                        query.get("incomeID"),
                        -1
                );


        int userID =
                parseInt(
                        query.get("userID"),
                        -1
                );


        if (
                incomeID <= 0
                        || userID <= 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Valid incomeID and userID required.\"}"
            );

            return;
        }


        IncomeDAO dao =
                new IncomeDAO();


        boolean success =
                dao.deleteIncome(
                        incomeID,
                        userID
                );


        if (!success) {

            sendJson(
                    exchange,
                    404,
                    "{\"success\":false,"
                            + "\"message\":\"Income record was not found.\"}"
            );

            return;
        }


        sendJson(
                exchange,
                200,
                "{\"success\":true,"
                        + "\"message\":\"Income deleted successfully.\"}"
        );
    }


    // ==================================================
    // EXPENSE CRUD
    // ==================================================

    private static void handleExpenses(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        String method =
                exchange
                        .getRequestMethod()
                        .toUpperCase();


        switch (method) {

            case "GET" ->
                    getExpenses(exchange);

            case "POST" ->
                    addExpense(exchange);

            case "PUT" ->
                    updateExpense(exchange);

            case "DELETE" ->
                    deleteExpense(exchange);

            default ->
                    sendJson(
                            exchange,
                            405,
                            "{\"success\":false,"
                                    + "\"message\":\"Unsupported request method.\"}"
                    );
        }
    }


    private static void getExpenses(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> query =
                parseQuery(exchange);


        int userID =
                parseInt(
                        query.get("userID"),
                        -1
                );


        if (userID <= 0) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Valid userID required.\"}"
            );

            return;
        }


        ExpenseDAO dao =
                new ExpenseDAO();


        List<Expense> expenses =
                dao.getExpensesByUser(
                        userID
                );


        StringBuilder json =
                new StringBuilder();


        json.append(
                "{\"success\":true,\"expenses\":["
        );


        for (
                int i = 0;
                i < expenses.size();
                i++
        ) {

            Expense expense =
                    expenses.get(i);


            if (i > 0) {
                json.append(",");
            }


            json.append("{");

            json.append(
                    "\"expenseID\":"
            );

            json.append(
                    expense.getExpenseID()
            );

            json.append(
                    ",\"userID\":"
            );

            json.append(
                    expense.getUserID()
            );

            json.append(
                    ",\"date\":\""
            );

            json.append(
                    expense.getExpenseDate()
            );

            json.append("\"");

            json.append(
                    ",\"source\":\""
            );

            json.append(
                    escapeJson(
                            expense.getSource()
                    )
            );

            json.append("\"");

            json.append(
                    ",\"amount\":"
            );

            json.append(
                    expense.getAmount()
            );

            json.append(
                    ",\"frequency\":"
            );

            json.append(
                    expense.getFrequency()
            );

            json.append(
                    ",\"category\":\""
            );

            json.append(
                    escapeJson(
                            expense.getCategory()
                    )
            );

            json.append("\"");

            json.append(
                    ",\"notes\":\""
            );

            json.append(
                    escapeJson(
                            expense.getNotes()
                    )
            );

            json.append("\"");

            json.append("}");
        }


        json.append("]}");


        sendJson(
                exchange,
                200,
                json.toString()
        );
    }


    private static void addExpense(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> form =
                readForm(exchange);


        int userID =
                parseInt(
                        form.get("userID"),
                        -1
                );


        String date =
                form.getOrDefault(
                        "date",
                        ""
                );


        String source =
                form.getOrDefault(
                        "source",
                        ""
                ).trim();


        double amount =
                parseDouble(
                        form.get("amount"),
                        -1
                );


        int frequency =
                parseInt(
                        form.get("frequency"),
                        1
                );


        String category =
                form.getOrDefault(
                        "category",
                        "General"
                ).trim();


        String notes =
                form.getOrDefault(
                        "notes",
                        ""
                );


        if (
                userID <= 0
                        || date.isBlank()
                        || source.isBlank()
                        || amount < 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid expense information.\"}"
            );

            return;
        }


        try {

            Expense expense =
                    new Expense(
                            0,
                            userID,
                            Date.valueOf(date),
                            source,
                            amount,
                            frequency,
                            category,
                            notes
                    );


            ExpenseDAO dao =
                    new ExpenseDAO();


            boolean success =
                    dao.addExpense(
                            expense
                    );


            if (!success) {

                sendJson(
                        exchange,
                        500,
                        "{\"success\":false,"
                                + "\"message\":\"Expense could not be added.\"}"
                );

                return;
            }


            sendJson(
                    exchange,
                    200,
                    "{\"success\":true,"
                            + "\"message\":\"Expense added successfully.\"}"
            );


        } catch (Exception e) {

            e.printStackTrace();


            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid expense date or values.\"}"
            );
        }
    }


    private static void updateExpense(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> form =
                readForm(exchange);


        int expenseID =
                parseInt(
                        form.get("expenseID"),
                        -1
                );


        int userID =
                parseInt(
                        form.get("userID"),
                        -1
                );


        String date =
                form.getOrDefault(
                        "date",
                        ""
                );


        String source =
                form.getOrDefault(
                        "source",
                        ""
                ).trim();


        double amount =
                parseDouble(
                        form.get("amount"),
                        -1
                );


        int frequency =
                parseInt(
                        form.get("frequency"),
                        1
                );


        String category =
                form.getOrDefault(
                        "category",
                        "General"
                ).trim();


        String notes =
                form.getOrDefault(
                        "notes",
                        ""
                );


        if (
                expenseID <= 0
                        || userID <= 0
                        || date.isBlank()
                        || source.isBlank()
                        || amount < 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid expense information.\"}"
            );

            return;
        }


        try {

            Expense expense =
                    new Expense(
                            expenseID,
                            userID,
                            Date.valueOf(date),
                            source,
                            amount,
                            frequency,
                            category,
                            notes
                    );


            ExpenseDAO dao =
                    new ExpenseDAO();


            boolean success =
                    dao.updateExpense(
                            expense
                    );


            if (!success) {

                sendJson(
                        exchange,
                        404,
                        "{\"success\":false,"
                                + "\"message\":\"Expense record was not found.\"}"
                );

                return;
            }


            sendJson(
                    exchange,
                    200,
                    "{\"success\":true,"
                            + "\"message\":\"Expense updated successfully.\"}"
            );


        } catch (Exception e) {

            e.printStackTrace();


            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid expense values.\"}"
            );
        }
    }


    private static void deleteExpense(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> query =
                parseQuery(exchange);


        int expenseID =
                parseInt(
                        query.get("expenseID"),
                        -1
                );


        int userID =
                parseInt(
                        query.get("userID"),
                        -1
                );


        if (
                expenseID <= 0
                        || userID <= 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Valid expenseID and userID required.\"}"
            );

            return;
        }


        ExpenseDAO dao =
                new ExpenseDAO();


        boolean success =
                dao.deleteExpense(
                        expenseID,
                        userID
                );


        if (!success) {

            sendJson(
                    exchange,
                    404,
                    "{\"success\":false,"
                            + "\"message\":\"Expense record was not found.\"}"
            );

            return;
        }


        sendJson(
                exchange,
                200,
                "{\"success\":true,"
                        + "\"message\":\"Expense deleted successfully.\"}"
        );
    }


    // ==================================================
    // PLAN CRUD
    // ==================================================

    private static void handlePlans(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        String method =
                exchange
                        .getRequestMethod()
                        .toUpperCase();


        switch (method) {

            case "GET" ->
                    getPlans(exchange);

            case "POST" ->
                    addPlan(exchange);

            case "PUT" ->
                    updatePlan(exchange);

            case "DELETE" ->
                    deletePlan(exchange);

            default ->
                    sendJson(
                            exchange,
                            405,
                            "{\"success\":false,"
                                    + "\"message\":\"Unsupported request method.\"}"
                    );
        }
    }


    private static void getPlans(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> query =
                parseQuery(exchange);


        int userID =
                parseInt(
                        query.get("userID"),
                        -1
                );


        if (userID <= 0) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Valid userID required.\"}"
            );

            return;
        }


        PlanDAO dao =
                new PlanDAO();


        List<Plan> plans =
                dao.getPlansByUser(
                        userID
                );


        StringBuilder json =
                new StringBuilder();


        json.append(
                "{\"success\":true,\"plans\":["
        );


        for (
                int i = 0;
                i < plans.size();
                i++
        ) {

            Plan plan =
                    plans.get(i);


            if (i > 0) {
                json.append(",");
            }


            json.append("{");

            json.append(
                    "\"planID\":"
            );

            json.append(
                    plan.getPlanID()
            );

            json.append(
                    ",\"userID\":"
            );

            json.append(
                    plan.getUserID()
            );

            json.append(
                    ",\"date\":\""
            );

            json.append(
                    plan.getPlanDate()
            );

            json.append("\"");

            json.append(
                    ",\"description\":\""
            );

            json.append(
                    escapeJson(
                            plan.getDescription()
                    )
            );

            json.append("\"");

            json.append(
                    ",\"goalAmount\":"
            );

            json.append(
                    plan.getGoalAmount()
            );

            json.append(
                    ",\"savedAmount\":"
            );

            json.append(
                    plan.getSavedAmount()
            );

            json.append("}");
        }


        json.append("]}");


        sendJson(
                exchange,
                200,
                json.toString()
        );
    }


    private static void addPlan(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> form =
                readForm(exchange);


        int userID =
                parseInt(
                        form.get("userID"),
                        -1
                );


        String date =
                form.getOrDefault(
                        "date",
                        ""
                );


        String description =
                form.getOrDefault(
                        "description",
                        ""
                ).trim();


        double goalAmount =
                parseDouble(
                        form.get("goalAmount"),
                        -1
                );


        double savedAmount =
                parseDouble(
                        form.get("savedAmount"),
                        0
                );


        if (
                userID <= 0
                        || date.isBlank()
                        || description.isBlank()
                        || goalAmount < 0
                        || savedAmount < 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid planning information.\"}"
            );

            return;
        }


        try {

            Plan plan =
                    new Plan(
                            0,
                            userID,
                            Date.valueOf(date),
                            description,
                            goalAmount,
                            savedAmount
                    );


            PlanDAO dao =
                    new PlanDAO();


            boolean success =
                    dao.addPlan(
                            plan
                    );


            if (!success) {

                sendJson(
                        exchange,
                        500,
                        "{\"success\":false,"
                                + "\"message\":\"Plan could not be added.\"}"
                );

                return;
            }


            sendJson(
                    exchange,
                    200,
                    "{\"success\":true,"
                            + "\"message\":\"Plan added successfully.\"}"
            );


        } catch (Exception e) {

            e.printStackTrace();


            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid plan date or values.\"}"
            );
        }
    }


    private static void updatePlan(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> form =
                readForm(exchange);


        int planID =
                parseInt(
                        form.get("planID"),
                        -1
                );


        int userID =
                parseInt(
                        form.get("userID"),
                        -1
                );


        String date =
                form.getOrDefault(
                        "date",
                        ""
                );


        String description =
                form.getOrDefault(
                        "description",
                        ""
                ).trim();


        double goalAmount =
                parseDouble(
                        form.get("goalAmount"),
                        -1
                );


        double savedAmount =
                parseDouble(
                        form.get("savedAmount"),
                        0
                );


        if (
                planID <= 0
                        || userID <= 0
                        || date.isBlank()
                        || description.isBlank()
                        || goalAmount < 0
                        || savedAmount < 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid planning information.\"}"
            );

            return;
        }


        try {

            Plan plan =
                    new Plan(
                            planID,
                            userID,
                            Date.valueOf(date),
                            description,
                            goalAmount,
                            savedAmount
                    );


            PlanDAO dao =
                    new PlanDAO();


            boolean success =
                    dao.updatePlan(
                            plan
                    );


            if (!success) {

                sendJson(
                        exchange,
                        404,
                        "{\"success\":false,"
                                + "\"message\":\"Plan was not found.\"}"
                );

                return;
            }


            sendJson(
                    exchange,
                    200,
                    "{\"success\":true,"
                            + "\"message\":\"Plan updated successfully.\"}"
            );


        } catch (Exception e) {

            e.printStackTrace();


            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Invalid planning values.\"}"
            );
        }
    }


    private static void deletePlan(
            HttpExchange exchange)
            throws IOException {

        Map<String, String> query =
                parseQuery(exchange);


        int planID =
                parseInt(
                        query.get("planID"),
                        -1
                );


        int userID =
                parseInt(
                        query.get("userID"),
                        -1
                );


        if (
                planID <= 0
                        || userID <= 0
        ) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Valid planID and userID required.\"}"
            );

            return;
        }


        PlanDAO dao =
                new PlanDAO();


        boolean success =
                dao.deletePlan(
                        planID,
                        userID
                );


        if (!success) {

            sendJson(
                    exchange,
                    404,
                    "{\"success\":false,"
                            + "\"message\":\"Plan was not found.\"}"
            );

            return;
        }


        sendJson(
                exchange,
                200,
                "{\"success\":true,"
                        + "\"message\":\"Plan deleted successfully.\"}"
        );
    }


    // ==================================================
    // REPORTS
    // ==================================================

    private static void handleIncomeReport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        int userID =
                getUserIDFromQuery(
                        exchange
                );


        if (userID <= 0) {

            sendText(
                    exchange,
                    400,
                    "Valid userID required"
            );

            return;
        }


        IncomeReport report =
                new IncomeReport();


        sendText(
                exchange,
                200,
                report.generateReport(
                        userID
                )
        );
    }


    private static void handleExpenseReport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        int userID =
                getUserIDFromQuery(
                        exchange
                );


        if (userID <= 0) {

            sendText(
                    exchange,
                    400,
                    "Valid userID required"
            );

            return;
        }


        ExpenseReport report =
                new ExpenseReport();


        sendText(
                exchange,
                200,
                report.generateReport(
                        userID
                )
        );
    }


    private static void handleFullReport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        int userID =
                getUserIDFromQuery(
                        exchange
                );


        if (userID <= 0) {

            sendText(
                    exchange,
                    400,
                    "Valid userID required"
            );

            return;
        }


        FinancialReport report =
                new FinancialReport();


        sendText(
                exchange,
                200,
                report.generateReport(
                        userID
                )
        );
    }


    // ==================================================
    // CSV EXPORT - INCOME
    // ==================================================

    private static void handleIncomeExport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        int userID =
                getUserIDFromQuery(
                        exchange
                );


        if (userID <= 0) {

            sendText(
                    exchange,
                    400,
                    "Valid userID required"
            );

            return;
        }


        Path tempFile =
                Files.createTempFile(
                        "ewallet_income_",
                        ".csv"
                );


        CSVExporter exporter =
                new CSVExporter();


        boolean success =
                exporter.exportIncome(
                        userID,
                        tempFile.toString()
                );


        if (!success) {

            Files.deleteIfExists(
                    tempFile
            );


            sendText(
                    exchange,
                    500,
                    "Income export failed."
            );

            return;
        }


        sendCSVFile(
                exchange,
                tempFile,
                "income_report.csv"
        );
    }


    // ==================================================
    // CSV EXPORT - EXPENSES
    // ==================================================

    private static void handleExpenseExport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        int userID =
                getUserIDFromQuery(
                        exchange
                );


        if (userID <= 0) {

            sendText(
                    exchange,
                    400,
                    "Valid userID required"
            );

            return;
        }


        Path tempFile =
                Files.createTempFile(
                        "ewallet_expenses_",
                        ".csv"
                );


        CSVExporter exporter =
                new CSVExporter();


        boolean success =
                exporter.exportExpenses(
                        userID,
                        tempFile.toString()
                );


        if (!success) {

            Files.deleteIfExists(
                    tempFile
            );


            sendText(
                    exchange,
                    500,
                    "Expense export failed."
            );

            return;
        }


        sendCSVFile(
                exchange,
                tempFile,
                "expense_report.csv"
        );
    }


    // ==================================================
    // CSV EXPORT - FULL
    // ==================================================

    private static void handleFullExport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        int userID =
                getUserIDFromQuery(
                        exchange
                );


        if (userID <= 0) {

            sendText(
                    exchange,
                    400,
                    "Valid userID required"
            );

            return;
        }


        Path tempFile =
                Files.createTempFile(
                        "ewallet_full_",
                        ".csv"
                );


        CSVExporter exporter =
                new CSVExporter();


        boolean success =
                exporter.exportFullReport(
                        userID,
                        tempFile.toString()
                );


        if (!success) {

            Files.deleteIfExists(
                    tempFile
            );


            sendText(
                    exchange,
                    500,
                    "Full export failed."
            );

            return;
        }


        sendCSVFile(
                exchange,
                tempFile,
                "ewallet_financial_report.csv"
        );
    }


    // ==================================================
    // CSV IMPORT - INCOME
    // ==================================================

    private static void handleIncomeImport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        if (!exchange
                .getRequestMethod()
                .equalsIgnoreCase("POST")) {

            sendJson(
                    exchange,
                    405,
                    "{\"success\":false,"
                            + "\"message\":\"POST required\"}"
            );

            return;
        }


        int userID =
                getUserIDFromQuery(
                        exchange
                );


        if (userID <= 0) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Valid userID required\"}"
            );

            return;
        }


        String csvText =
                new String(
                        exchange
                                .getRequestBody()
                                .readAllBytes(),
                        StandardCharsets.UTF_8
                );


        Path tempFile =
                Files.createTempFile(
                        "income_import_",
                        ".csv"
                );


        Files.writeString(
                tempFile,
                csvText,
                StandardCharsets.UTF_8
        );


        CSVImporter importer =
                new CSVImporter();


        int imported =
                importer.importIncome(
                        userID,
                        tempFile.toString()
                );


        Files.deleteIfExists(
                tempFile
        );


        sendJson(
                exchange,
                200,
                "{\"success\":true,"
                        + "\"imported\":"
                        + imported
                        + ","
                        + "\"message\":\""
                        + imported
                        + " income records imported.\"}"
        );
    }


    // ==================================================
    // CSV IMPORT - EXPENSES
    // ==================================================

    private static void handleExpenseImport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        if (!exchange
                .getRequestMethod()
                .equalsIgnoreCase("POST")) {

            sendJson(
                    exchange,
                    405,
                    "{\"success\":false,"
                            + "\"message\":\"POST required\"}"
            );

            return;
        }


        int userID =
                getUserIDFromQuery(
                        exchange
                );


        if (userID <= 0) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                            + "\"message\":\"Valid userID required\"}"
            );

            return;
        }


        String csvText =
                new String(
                        exchange
                                .getRequestBody()
                                .readAllBytes(),
                        StandardCharsets.UTF_8
                );


        Path tempFile =
                Files.createTempFile(
                        "expense_import_",
                        ".csv"
                );


        Files.writeString(
                tempFile,
                csvText,
                StandardCharsets.UTF_8
        );


        CSVImporter importer =
                new CSVImporter();


        int imported =
                importer.importExpenses(
                        userID,
                        tempFile.toString()
                );


        Files.deleteIfExists(
                tempFile
        );


        sendJson(
                exchange,
                200,
                "{\"success\":true,"
                        + "\"imported\":"
                        + imported
                        + ","
                        + "\"message\":\""
                        + imported
                        + " expense records imported.\"}"
        );
    }


    // ==================================================
    // STATIC WEBSITE FILES
    // ==================================================

    private static void handleStaticFile(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }


        if (!exchange
                .getRequestMethod()
                .equalsIgnoreCase("GET")) {

            sendText(
                    exchange,
                    405,
                    "GET required"
            );

            return;
        }


        String requestPath =
                URLDecoder.decode(
                        exchange
                                .getRequestURI()
                                .getPath(),
                        StandardCharsets.UTF_8
                );


        if (
                requestPath.equals("/")
                        || requestPath.isBlank()
        ) {

            requestPath =
                    "/index.html";
        }


        Path file =
                WEB_ROOT
                        .resolve(
                                requestPath.substring(1)
                        )
                        .normalize();


        if (
                !file.startsWith(
                        WEB_ROOT
                )
        ) {

            sendText(
                    exchange,
                    403,
                    "Access denied"
            );

            return;
        }


        if (
                !Files.exists(file)
                        || Files.isDirectory(file)
        ) {

            sendText(
                    exchange,
                    404,
                    "File not found: "
                            + requestPath
            );

            return;
        }


        byte[] data =
                Files.readAllBytes(
                        file
                );


        exchange
                .getResponseHeaders()
                .set(
                        "Content-Type",
                        contentType(file)
                );


        exchange.sendResponseHeaders(
                200,
                data.length
        );


        try (
                OutputStream output =
                        exchange.getResponseBody()
        ) {

            output.write(
                    data
            );
        }
    }


    // ==================================================
    // FORM / QUERY HELPERS
    // ==================================================

    private static Map<String, String> readForm(
            HttpExchange exchange)
            throws IOException {

        String body =
                new String(
                        exchange
                                .getRequestBody()
                                .readAllBytes(),
                        StandardCharsets.UTF_8
                );


        return parseForm(
                body
        );
    }


    private static Map<String, String> parseForm(
            String body) {

        Map<String, String> values =
                new HashMap<>();


        if (
                body == null
                        || body.isBlank()
        ) {

            return values;
        }


        String[] parts =
                body.split("&");


        for (String part : parts) {

            String[] pair =
                    part.split(
                            "=",
                            2
                    );


            String key =
                    URLDecoder.decode(
                            pair[0],
                            StandardCharsets.UTF_8
                    );


            String value =
                    pair.length > 1
                            ? URLDecoder.decode(
                                    pair[1],
                                    StandardCharsets.UTF_8
                            )
                            : "";


            values.put(
                    key,
                    value
            );
        }


        return values;
    }


    private static Map<String, String> parseQuery(
            HttpExchange exchange) {

        Map<String, String> values =
                new HashMap<>();


        String query =
                exchange
                        .getRequestURI()
                        .getQuery();


        if (
                query == null
                        || query.isBlank()
        ) {

            return values;
        }


        String[] parts =
                query.split("&");


        for (String part : parts) {

            String[] pair =
                    part.split(
                            "=",
                            2
                    );


            String key =
                    URLDecoder.decode(
                            pair[0],
                            StandardCharsets.UTF_8
                    );


            String value =
                    pair.length > 1
                            ? URLDecoder.decode(
                                    pair[1],
                                    StandardCharsets.UTF_8
                            )
                            : "";


            values.put(
                    key,
                    value
            );
        }


        return values;
    }


    private static int getUserIDFromQuery(
            HttpExchange exchange) {

        Map<String, String> query =
                parseQuery(
                        exchange
                );


        return parseInt(
                query.get("userID"),
                -1
        );
    }


    private static int parseInt(
            String value,
            int fallback) {

        try {

            return Integer.parseInt(
                    value
            );

        } catch (Exception e) {

            return fallback;
        }
    }


    private static double parseDouble(
            String value,
            double fallback) {

        try {

            return Double.parseDouble(
                    value
            );

        } catch (Exception e) {

            return fallback;
        }
    }


    private static String escapeJson(
            String value) {

        if (value == null) {
            return "";
        }


        return value
                .replace(
                        "\\",
                        "\\\\"
                )
                .replace(
                        "\"",
                        "\\\""
                )
                .replace(
                        "\n",
                        "\\n"
                )
                .replace(
                        "\r",
                        "\\r"
                );
    }


    // ==================================================
    // HTTP HELPERS
    // ==================================================

    private static boolean handleOptions(
            HttpExchange exchange)
            throws IOException {

        if (
                exchange
                        .getRequestMethod()
                        .equalsIgnoreCase(
                                "OPTIONS"
                        )
        ) {

            exchange.sendResponseHeaders(
                    204,
                    -1
            );


            exchange.close();


            return true;
        }


        return false;
    }


    private static void addCorsHeaders(
            HttpExchange exchange) {

        exchange
                .getResponseHeaders()
                .set(
                        "Access-Control-Allow-Origin",
                        "*"
                );


        exchange
                .getResponseHeaders()
                .set(
                        "Access-Control-Allow-Methods",
                        "GET, POST, PUT, DELETE, OPTIONS"
                );


        exchange
                .getResponseHeaders()
                .set(
                        "Access-Control-Allow-Headers",
                        "Content-Type"
                );


        exchange
                .getResponseHeaders()
                .set(
                        "Cache-Control",
                        "no-store"
                );
    }


    private static void sendCSVFile(
            HttpExchange exchange,
            Path file,
            String downloadName)
            throws IOException {

        byte[] data =
                Files.readAllBytes(
                        file
                );


        exchange
                .getResponseHeaders()
                .set(
                        "Content-Type",
                        "text/csv; charset=UTF-8"
                );


        exchange
                .getResponseHeaders()
                .set(
                        "Content-Disposition",
                        "attachment; filename=\""
                                + downloadName
                                + "\""
                );


        exchange.sendResponseHeaders(
                200,
                data.length
        );


        try (
                OutputStream output =
                        exchange.getResponseBody()
        ) {

            output.write(
                    data
            );
        }


        Files.deleteIfExists(
                file
        );
    }


    private static void sendJson(
            HttpExchange exchange,
            int status,
            String json)
            throws IOException {

        byte[] bytes =
                json.getBytes(
                        StandardCharsets.UTF_8
                );


        exchange
                .getResponseHeaders()
                .set(
                        "Content-Type",
                        "application/json; charset=UTF-8"
                );


        exchange.sendResponseHeaders(
                status,
                bytes.length
        );


        try (
                OutputStream output =
                        exchange.getResponseBody()
        ) {

            output.write(
                    bytes
            );
        }
    }


    private static void sendText(
            HttpExchange exchange,
            int status,
            String text)
            throws IOException {

        byte[] bytes =
                text.getBytes(
                        StandardCharsets.UTF_8
                );


        exchange
                .getResponseHeaders()
                .set(
                        "Content-Type",
                        "text/plain; charset=UTF-8"
                );


        exchange.sendResponseHeaders(
                status,
                bytes.length
        );


        try (
                OutputStream output =
                        exchange.getResponseBody()
        ) {

            output.write(
                    bytes
            );
        }
    }


    private static String contentType(
            Path file) {

        String name =
                file
                        .getFileName()
                        .toString()
                        .toLowerCase();


        if (name.endsWith(".html")) {
            return "text/html; charset=UTF-8";
        }


        if (name.endsWith(".css")) {
            return "text/css; charset=UTF-8";
        }


        if (name.endsWith(".js")) {
            return "text/javascript; charset=UTF-8";
        }


        if (name.endsWith(".csv")) {
            return "text/csv; charset=UTF-8";
        }


        if (name.endsWith(".png")) {
            return "image/png";
        }


        if (
                name.endsWith(".jpg")
                        || name.endsWith(".jpeg")
        ) {
            return "image/jpeg";
        }


        if (name.endsWith(".gif")) {
            return "image/gif";
        }


        if (name.endsWith(".svg")) {
            return "image/svg+xml";
        }


        if (name.endsWith(".ico")) {
            return "image/x-icon";
        }


        return "application/octet-stream";
    }
}