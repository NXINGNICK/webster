package me.nxingnick.webster.commands;

import me.nxingnick.webster.WebsterPlugin;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class WebsterCommandExecutor implements CommandExecutor, TabCompleter {
    private final WebsterPlugin plugin;

    public WebsterCommandExecutor(WebsterPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!command.getName().equalsIgnoreCase("wb") && !command.getName().equalsIgnoreCase("webster")) {
            return false;
        }
        if (args.length == 0) {
            sender.sendMessage("Usage: /wb <start|stop|status|reg list|reg accept|reg deny|alogin|email|dwipe>");
            return true;
        }

        switch (args[0].toLowerCase()) {
            case "start" -> {
                if (plugin.isServerRunning()) {
                    sender.sendMessage("Webster server is already running.");
                } else {
                    plugin.startServer();
                    sender.sendMessage("Webster server started.");
                }
            }
            case "stop" -> {
                if (!plugin.isServerRunning()) {
                    sender.sendMessage("Webster server is not running.");
                } else {
                    plugin.stopServer();
                    sender.sendMessage("Webster server stopped.");
                }
            }
            case "status" -> {
                sender.sendMessage(plugin.isServerRunning() ? 
                    "Webster server is running." : 
                    "Webster server is not running.");
            }
            case "alogin" -> {
                if (!sender.hasPermission("webster.admin")) {
                    sender.sendMessage("§cYou don't have permission to use this command.");
                    return true;
                }
                if (args.length != 2) {
                    sender.sendMessage("§cUsage: /wb alogin <email>");
                    return true;
                }

                String adminEmail = args[1].toLowerCase();
                String generatedPassword = plugin.generateSecurePassword();

                if (plugin.createOrUpdateAdminAccount(adminEmail, generatedPassword)) {
                    sender.sendMessage("§aAdmin account created/updated!");
                    sender.sendMessage("§6Email: §f" + adminEmail);
                    sender.sendMessage("§6Password: §f" + generatedPassword);
                    sender.sendMessage("§ePassword is only shown once!");
                } else {
                    sender.sendMessage("§cFailed to create or update admin account.");
                }
            }
            case "reg" -> {
                if (args.length < 2) {
                    sender.sendMessage("Usage: /wb reg <list|accept|deny>");
                    return true;
                }
                handleRegCommand(sender, args);
            }
            case "email" -> {
                if (args.length < 3) {
                    sender.sendMessage("Usage: /wb email <recipient> <message>");
                    return true;
                }
                String recipient = args[1];
                String textMessage = Arrays.stream(args).skip(2).collect(Collectors.joining(" "));
                plugin.getEmailService().sendEmail(recipient, "This is a text email", textMessage);
                sender.sendMessage("Email sent to " + recipient + " subject 'This is a text email'");
            }
            case "dwipe" -> {
                if (!sender.hasPermission("webster.admin")) {
                    sender.sendMessage("§cYou don't have permission to use this command.");
                    return true;
                }

                if (args.length != 2 || !args[1].equalsIgnoreCase("confirm")) {
                    sender.sendMessage("§c⚠ WARNING: This will delete ALL data stored by Webster!");
                    sender.sendMessage("§cTo confirm, type: /wb dwipe confirm");
                    return true;
                }

                try {
                    plugin.getDatabaseHelper().wipeAllData();
                    sender.sendMessage("§aAll Webster data has been wiped from the database.");
                    sender.sendMessage("§eThe tables have been recreated empty.");
                } catch (Exception e) {
                    sender.sendMessage("§cFailed to wipe database: " + e.getMessage());
                    plugin.getLogger().severe("Database wipe failed: " + e.getMessage());
                }
            }
            default -> {
                sender.sendMessage("Unknown command. /wb <start|stop|status|reg list|reg accept|reg deny|alogin|email|dwipe>");
            }
        }
        return true;
    }

    private void handleRegCommand(CommandSender sender, String[] args) {
        switch (args[1].toLowerCase()) {
            case "list" -> {
                String listType = (args.length > 2) ? args[2].toLowerCase() : "all";
                if (!listType.equals("all") && !listType.equals("accepted") && !listType.equals("denied")) {
                    sender.sendMessage("Usage: /wb reg list <all|accepted|denied>");
                    return;
                }
                List<Map<String, String>> users = plugin.getDatabaseHelper().getUsers(listType);
                if (users.isEmpty()) {
                    sender.sendMessage("No users found for type: " + listType);
                } else {
                    sender.sendMessage("=== " + listType.toUpperCase() + " Users ===");
                    for (Map<String, String> user : users) {
                        sender.sendMessage(
                            "IGN: " + user.get("ign")
                                + ", Discord: " + user.get("discord")
                                + ", Telegram: " + user.get("telegram")
                                + ", Email: " + user.get("email")
                                + ", Type: " + user.get("type")
                        );
                    }
                }
            }
            case "accept" -> {
                if (args.length < 3) {
                    sender.sendMessage("Usage: /wb reg accept <ign>");
                    return;
                }
                String providedIgn = args[2].replace("\"", "");
                if (plugin.getDatabaseHelper().acceptUser(providedIgn, sender instanceof Player ? sender.getName() : "Console")) {
                    sender.sendMessage("User " + providedIgn + " accepted.");
                } else {
                    sender.sendMessage("User " + providedIgn + " not found.");
                }
            }
            case "deny" -> {
                if (args.length < 4) {
                    sender.sendMessage("Usage: /wb reg deny <ign> <reason>");
                    return;
                }
                String ign = args[2].replace("\"", "");
                String reason = Arrays.stream(args).skip(3).collect(Collectors.joining(" "));
                String deniedBy = sender instanceof Player ? sender.getName() : "Console";

                if (plugin.getDatabaseHelper().denyUser(ign, deniedBy, reason)) {
                    sender.sendMessage("User " + ign + " denied. Reason: " + reason);
                } else {
                    sender.sendMessage("User " + ign + " not found in 'users'.");
                }
            }
            default -> sender.sendMessage("Usage: /wb reg <list|accept|deny>");
        }
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (!command.getName().equalsIgnoreCase("wb") && !command.getName().equalsIgnoreCase("webster")) {
            return Collections.emptyList();
        }
        if (args.length == 1) {
            List<String> cmds = new ArrayList<>(Arrays.asList("start", "stop", "status", "reg", "email"));
            if (sender.hasPermission("webster.admin")) {
                cmds.add("alogin");
                cmds.add("dwipe");
            }
            return cmds;
        } else if (args.length == 2) {
            if (args[0].equalsIgnoreCase("reg")) {
                return Arrays.asList("list", "accept", "deny");
            } else if (args[0].equalsIgnoreCase("dwipe")) {
                return Collections.singletonList("confirm");
            }
        } else if (args.length == 3 && args[0].equalsIgnoreCase("reg") && args[1].equalsIgnoreCase("list")) {
            return Arrays.asList("all", "accepted", "denied");
        }
        return Collections.emptyList();
    }
} 