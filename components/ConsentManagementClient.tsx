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
import { Search, FileText, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";
import { ConsentType } from "@/lib/definitions";
import { useHasPermission } from "@/lib/hooks/use-permissions";
import { Permission } from "@/lib/definitions";

// Mock consent data for demonstration
const MOCK_CONSENTS = [
  {
    id: "1",
    patientId: "P001",
    patientName: "John Doe",
    consentType: ConsentType.TREATMENT,
    status: "granted",
    grantedDate: "2024-01-15",
    expiresDate: "2025-01-15",
    grantedBy: "Dr. Smith",
    surveyId: "survey_001",
  },
  {
    id: "2",
    patientId: "P001",
    patientName: "John Doe",
    consentType: ConsentType.RESEARCH,
    status: "granted",
    grantedDate: "2024-02-01",
    expiresDate: null,
    grantedBy: "Dr. Johnson",
    surveyId: "survey_002",
  },
  {
    id: "3",
    patientId: "P002",
    patientName: "Jane Smith",
    consentType: ConsentType.DATA_SHARING,
    status: "withdrawn",
    grantedDate: "2023-12-10",
    withdrawnDate: "2024-03-15",
    expiresDate: null,
    grantedBy: "Dr. Lee",
    surveyId: "survey_003",
  },
  {
    id: "4",
    patientId: "P003",
    patientName: "Robert Johnson",
    consentType: ConsentType.MARKETING,
    status: "expired",
    grantedDate: "2023-01-01",
    expiresDate: "2024-01-01",
    grantedBy: "Admin",
    surveyId: null,
  },
];

const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  [ConsentType.TREATMENT]: "Treatment & Care",
  [ConsentType.RESEARCH]: "Research Participation",
  [ConsentType.RESEARCH_PARTICIPATION]: "Research Participation",
  [ConsentType.SURVEY_PARTICIPATION]: "Survey Participation",
  [ConsentType.DATA_SHARING]: "Data Sharing",
  [ConsentType.MARKETING]: "Marketing Communications",
  [ConsentType.THIRD_PARTY_DISCLOSURE]: "Third-Party Disclosure",
  [ConsentType.PARENTAL_CONSENT]: "Parental Consent",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "granted":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    case "withdrawn":
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" />
          Withdrawn
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
          <Clock className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ConsentManagementClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const canManageConsents = useHasPermission(Permission.MANAGE_CONSENTS);
  const canViewConsents = useHasPermission(Permission.VIEW_CONSENTS);

  // Filter consents based on search and filters
  const filteredConsents = MOCK_CONSENTS.filter((consent) => {
    const matchesSearch =
      consent.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      consent.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || consent.status === statusFilter;
    const matchesType = typeFilter === "all" || consent.consentType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (!canViewConsents && !canManageConsents) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to view consent records.
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
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Consents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {MOCK_CONSENTS.filter((c) => c.status === "granted").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Withdrawn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {MOCK_CONSENTS.filter((c) => c.status === "withdrawn").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {MOCK_CONSENTS.filter((c) => c.status === "expired").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {MOCK_CONSENTS.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Records</CardTitle>
          <CardDescription>
            View and manage patient consent forms and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by patient name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="granted">Active</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Consent Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(CONSENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Consent Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Consent Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Granted Date</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Granted By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConsents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No consent records found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsents.map((consent) => (
                    <TableRow key={consent.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{consent.patientName}</div>
                          <div className="text-sm text-gray-500">{consent.patientId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {CONSENT_TYPE_LABELS[consent.consentType]}
                      </TableCell>
                      <TableCell>{getStatusBadge(consent.status)}</TableCell>
                      <TableCell>
                        {new Date(consent.grantedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {consent.expiresDate
                          ? new Date(consent.expiresDate).toLocaleDateString()
                          : "No expiration"}
                      </TableCell>
                      <TableCell>{consent.grantedBy}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
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
