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
import java.util.HashMap;
import java.util.Map;

public class EWalletServer {

    private static final int PORT = 8081;

    private static final Path WEB_ROOT =
            Path.of("..").toAbsolutePath().normalize();

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

            // Existing website
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

            System.out.println();

            System.out.println(
                    "Open the application at:"
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

            System.out.println(WEB_ROOT);

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

        String requestBody =
                new String(
                        exchange
                                .getRequestBody()
                                .readAllBytes(),
                        StandardCharsets.UTF_8
                );

        Map<String, String> form =
                parseForm(requestBody);

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
                dao.getUserByUsername(username);

        // Existing user = login
        if (existing != null) {

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
                        + "\"message\":\"Invalid account credentials provided.\"}"
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

        // New user = create account
        User newUser =
                new User(
                        0,
                        username,
                        passwordHash,
                        baseBalance,
                        baseIncome
                );

        boolean created =
                dao.addUser(newUser);

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
                dao.getUserByUsername(username);

        if (createdUser == null) {

            sendJson(
                    exchange,
                    500,
                    "{\"success\":false,"
                    + "\"message\":\"Account was created but could not be loaded.\"}"
            );

            return;
        }

        sendUserResponse(
                exchange,
                createdUser,
                true
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
                + "\"created\":" + created + ","
                + "\"user\":{"
                + "\"userID\":"
                + user.getUserID()
                + ","
                + "\"username\":\""
                + escapeJson(user.getUsername())
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
    // REPORTS
    // ==================================================

    private static void handleIncomeReport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }

        if (!isGet(exchange)) {
            sendText(exchange, 405, "GET required");
            return;
        }

        int userID =
                getUserIDFromQuery(exchange);

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
                report.generateReport(userID)
        );
    }

    private static void handleExpenseReport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }

        if (!isGet(exchange)) {
            sendText(exchange, 405, "GET required");
            return;
        }

        int userID =
                getUserIDFromQuery(exchange);

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
                report.generateReport(userID)
        );
    }

    private static void handleFullReport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }

        if (!isGet(exchange)) {
            sendText(exchange, 405, "GET required");
            return;
        }

        int userID =
                getUserIDFromQuery(exchange);

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
                report.generateReport(userID)
        );
    }

    // ==================================================
    // CSV EXPORT
    // ==================================================

    private static void handleIncomeExport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }

        int userID =
                getUserIDFromQuery(exchange);

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

            Files.deleteIfExists(tempFile);

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

    private static void handleExpenseExport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }

        int userID =
                getUserIDFromQuery(exchange);

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

            Files.deleteIfExists(tempFile);

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

    private static void handleFullExport(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }

        int userID =
                getUserIDFromQuery(exchange);

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

            Files.deleteIfExists(tempFile);

            sendText(
                    exchange,
                    500,
                    "Full report export failed."
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
                getUserIDFromQuery(exchange);

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

        if (csvText.isBlank()) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                    + "\"message\":\"CSV file was empty\"}"
            );

            return;
        }

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

        Files.deleteIfExists(tempFile);

        sendJson(
                exchange,
                200,
                "{"
                + "\"success\":true,"
                + "\"imported\":"
                + imported
                + ","
                + "\"message\":\""
                + imported
                + " income records imported.\""
                + "}"
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
                getUserIDFromQuery(exchange);

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

        if (csvText.isBlank()) {

            sendJson(
                    exchange,
                    400,
                    "{\"success\":false,"
                    + "\"message\":\"CSV file was empty\"}"
            );

            return;
        }

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

        Files.deleteIfExists(tempFile);

        sendJson(
                exchange,
                200,
                "{"
                + "\"success\":true,"
                + "\"imported\":"
                + imported
                + ","
                + "\"message\":\""
                + imported
                + " expense records imported.\""
                + "}"
        );
    }

    // ==================================================
    // SEND CSV FILE
    // ==================================================

    private static void sendCSVFile(
            HttpExchange exchange,
            Path file,
            String downloadName)
            throws IOException {

        byte[] data =
                Files.readAllBytes(file);

        exchange.getResponseHeaders().set(
                "Content-Type",
                "text/csv; charset=UTF-8"
        );

        exchange.getResponseHeaders().set(
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

            output.write(data);
        }

        Files.deleteIfExists(file);
    }

    // ==================================================
    // STATIC GUI FILES
    // ==================================================

    private static void handleStaticFile(
            HttpExchange exchange)
            throws IOException {

        addCorsHeaders(exchange);

        if (handleOptions(exchange)) {
            return;
        }

        if (!isGet(exchange)) {

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

        if (!file.startsWith(WEB_ROOT)) {

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
                Files.readAllBytes(file);

        exchange.getResponseHeaders().set(
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

            output.write(data);
        }
    }

    // ==================================================
    // HELPERS
    // ==================================================

    private static boolean isGet(
            HttpExchange exchange) {

        return exchange
                .getRequestMethod()
                .equalsIgnoreCase("GET");
    }

    private static int getUserIDFromQuery(
            HttpExchange exchange) {

        try {

            String query =
                    exchange
                            .getRequestURI()
                            .getQuery();

            if (query == null) {
                return -1;
            }

            String[] parts =
                    query.split("&");

            for (String part : parts) {

                String[] pair =
                        part.split("=", 2);

                if (
                        pair.length == 2
                        && pair[0].equals("userID")
                ) {

                    return Integer.parseInt(
                            pair[1]
                    );
                }
            }

        } catch (Exception e) {

            return -1;
        }

        return -1;
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
                    part.split("=", 2);

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

    private static double parseDouble(
            String value,
            double fallback) {

        try {

            return Double.parseDouble(value);

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
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private static boolean handleOptions(
            HttpExchange exchange)
            throws IOException {

        if (exchange
                .getRequestMethod()
                .equalsIgnoreCase("OPTIONS")) {

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

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Origin",
                "*"
        );

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS"
        );

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Headers",
                "Content-Type"
        );

        exchange.getResponseHeaders().set(
                "Cache-Control",
                "no-store"
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

        exchange.getResponseHeaders().set(
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

            output.write(bytes);
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

        exchange.getResponseHeaders().set(
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

            output.write(bytes);
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