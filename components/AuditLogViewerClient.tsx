"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Search,
  Shield,
  Eye,
  Download,
  AlertTriangle,
  Activity,
  FileText,
  Calendar,
} from "lucide-react";
import { AuditAction } from "@/lib/definitions";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { Permission } from "@/lib/definitions";

// Mock audit log data for demonstration
const MOCK_AUDIT_LOGS = [
  {
    id: "1",
    timestamp: "2024-11-14T10:30:00Z",
    userId: "user_001",
    userName: "Dr. Sarah Johnson",
    userRole: "physician",
    action: AuditAction.VIEW_PHI,
    resourceType: "survey_response",
    resourceId: "response_123",
    phiFields: ["name", "dob", "mrn"],
    ipAddress: "192.168.1.100",
    status: "success",
    details: "Viewed patient survey response",
  },
  {
    id: "2",
    timestamp: "2024-11-14T10:25:00Z",
    userId: "user_002",
    userName: "Jane Smith",
    userRole: "compliance_officer",
    action: AuditAction.EXPORT_DATA,
    resourceType: "survey_responses",
    resourceId: null,
    phiFields: null,
    ipAddress: "192.168.1.105",
    status: "success",
    details: "Exported de-identified research data (50 records)",
  },
  {
    id: "3",
    timestamp: "2024-11-14T10:20:00Z",
    userId: "user_003",
    userName: "Admin User",
    userRole: "system_admin",
    action: AuditAction.LOGIN_FAILED,
    resourceType: null,
    resourceId: null,
    phiFields: null,
    ipAddress: "192.168.1.200",
    status: "failure",
    details: "Invalid password attempt",
  },
  {
    id: "4",
    timestamp: "2024-11-14T09:45:00Z",
    userId: "user_001",
    userName: "Dr. Sarah Johnson",
    userRole: "physician",
    action: AuditAction.CONSENT_GRANTED,
    resourceType: "consent",
    resourceId: "consent_456",
    phiFields: null,
    ipAddress: "192.168.1.100",
    status: "success",
    details: "Patient granted consent for research participation",
  },
  {
    id: "5",
    timestamp: "2024-11-14T09:30:00Z",
    userId: "user_004",
    userName: "Bob Wilson",
    userRole: "research_coordinator",
    action: AuditAction.DATA_DEIDENTIFIED,
    resourceType: "survey_responses",
    resourceId: "batch_789",
    phiFields: null,
    ipAddress: "192.168.1.110",
    status: "success",
    details: "De-identified 25 responses using Safe Harbor method",
  },
];

const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  [AuditAction.LOGIN]: "Login",
  [AuditAction.LOGOUT]: "Logout",
  [AuditAction.LOGIN_FAILED]: "Failed Login",
  [AuditAction.VIEW_PHI]: "View PHI",
  [AuditAction.CREATE_SURVEY]: "Create Survey",
  [AuditAction.EDIT_SURVEY]: "Edit Survey",
  [AuditAction.DELETE_SURVEY]: "Delete Survey",
  [AuditAction.SUBMIT_RESPONSE]: "Submit Response",
  [AuditAction.VIEW_RESPONSE]: "View Response",
  [AuditAction.EXPORT_DATA]: "Export Data",
  [AuditAction.GRANT_ACCESS]: "Grant Access",
  [AuditAction.REVOKE_ACCESS]: "Revoke Access",
  [AuditAction.CONSENT_GRANTED]: "Consent Granted",
  [AuditAction.CONSENT_WITHDRAWN]: "Consent Withdrawn",
  [AuditAction.DATA_DEIDENTIFIED]: "Data De-identified",
  [AuditAction.DATA_DELETED]: "Data Deleted",
  [AuditAction.BREACH_DETECTED]: "Breach Detected",
};

function getActionBadge(action: AuditAction, status: string) {
  const label = ACTION_LABELS[action] || action;

  if (status === "failure") {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  }

  if (action === AuditAction.VIEW_PHI || action === AuditAction.EXPORT_DATA) {
    return (
      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
        <Shield className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  }

  if (action === AuditAction.BREACH_DETECTED) {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  }

  return <Badge variant="outline">{label}</Badge>;
}

export function AuditLogViewerClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState("today");

  const canViewAuditLogs = useHasPermission(Permission.VIEW_AUDIT_LOGS);

  // Filter logs based on search and filters
  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    // Date range filtering would be implemented here
    return matchesSearch && matchesAction;
  });

  if (!canViewAuditLogs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to view audit logs. This feature is
            restricted to System Administrators, Compliance Officers, and
            Auditors.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              PHI Access Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {
                MOCK_AUDIT_LOGS.filter(
                  (log) =>
                    log.action === AuditAction.VIEW_PHI ||
                    log.action === AuditAction.VIEW_RESPONSE
                ).length
              }
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Data Exports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {MOCK_AUDIT_LOGS.filter((log) => log.action === AuditAction.EXPORT_DATA).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Failed Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {MOCK_AUDIT_LOGS.filter((log) => log.status === "failure").length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {MOCK_AUDIT_LOGS.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log Events</CardTitle>
          <CardDescription>
            Comprehensive audit trail of all system activities and PHI access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user, action, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value={AuditAction.VIEW_PHI}>View PHI</SelectItem>
                <SelectItem value={AuditAction.EXPORT_DATA}>Export Data</SelectItem>
                <SelectItem value={AuditAction.LOGIN_FAILED}>Failed Logins</SelectItem>
                <SelectItem value={AuditAction.CONSENT_GRANTED}>
                  Consent Changes
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Audit Log Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>PHI Fields</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No audit logs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{log.userName}</div>
                          <div className="text-xs text-gray-500">{log.userRole}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action, log.status)}</TableCell>
                      <TableCell>
                        {log.resourceType ? (
                          <div className="text-sm">
                            <div>{log.resourceType}</div>
                            {log.resourceId && (
                              <div className="text-xs text-gray-500">{log.resourceId}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.phiFields ? (
                          <div className="flex flex-wrap gap-1">
                            {log.phiFields.map((field) => (
                              <Badge
                                key={field}
                                variant="outline"
                                className="text-xs"
                              >
                                {field}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {log.ipAddress}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
