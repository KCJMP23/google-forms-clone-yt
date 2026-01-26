# Complete Implementation Guide for All 14 Features

This document provides implementation details for all 14 enhancement features with code examples and architecture.

## ✅ COMPLETED FEATURES (1-6)

### Feature #1: Visual Form Builder ✅
**Status:** 100% Complete
**Files Created:**
- `lib/form-builder-types.ts` - Type definitions, templates
- `components/FormBuilderCanvas.tsx` - Main canvas with drag-and-drop
- `components/SortableFormField.tsx` - Drag handle for fields
- `components/FieldPalette.tsx` - 15 field types palette
- `components/FormSettingsPanel.tsx` - HIPAA settings
- `components/FormTemplateSelector.tsx` - Template chooser
- `app/dashboard/forms/new/page.tsx` - Form builder page
- `app/api/forms/route.ts` - CRUD API

**Key Features:**
- Drag-and-drop interface (@dnd-kit)
- Auto-PHI detection on field labels
- 15 field types (text, email, number, file upload, signature, rating, etc.)
- Pre-built templates (patient intake, satisfaction survey)
- HIPAA compliance settings panel
- Form preview and publishing

---

### Feature #2: Automated Notification System ✅
**Status:** 100% Complete
**Files Created:**
- `lib/notifications.ts` - Complete notification infrastructure

**Notification Types Implemented:**
1. Form submission confirmations
2. Consent expiring (30/60/90 day warnings)
3. Consent expired alerts
4. Survey reminders
5. Audit/security alerts
6. Break-glass access notifications
7. Weekly summary reports
8. Monthly summary reports

**Email Providers Supported:**
- SendGrid (with BAA)
- Mailgun (with BAA)

**Features:**
- HTML and text email templates
- Variable replacement
- Scheduled notifications
- Notification history
- Audit logging

---

### Feature #3: Advanced Analytics Dashboard ✅
**Status:** Core infrastructure complete
**Files Created:**
- `lib/analytics.ts` - Analytics engine

**Metrics Tracked:**
- Total responses
- Active surveys
- Completion rates
- Average response time
- Response rate by day
- Top performing surveys
- Demographics breakdown
- PHI access heatmaps

**Export Formats:**
- PDF reports (jsPDF)
- Excel (planned)
- CSV (planned)

---

### Feature #4: Participant Management System ✅
**Status:** Core infrastructure complete
**Files Created:**
- `lib/participant-management.ts` - Participant tracking

**Features:**
- Participant registry with MRN linkage
- Cross-survey response tracking
- Consent status management
- Cohort management
- Communication preferences
- Opt-out/withdrawal handling

**Data Structures:**
- `Participant` - Full participant profile
- `ConsentStatus` - Consent tracking
- `Cohort` - Group management

---

### Feature #5: Conditional Logic & Dynamic Forms ✅
**Status:** 100% Complete
**Files Created:**
- `lib/conditional-logic-engine.ts` - Logic engine

**Conditional Logic Operators:**
- equals, notEquals
- contains
- greaterThan, lessThan
- isEmpty, isNotEmpty

**Actions:**
- Show/hide fields
- Make fields required
- Set field values
- Calculate derived values (e.g., BMI)

**ConditionalLogicEngine Class:**
```typescript
const engine = new ConditionalLogicEngine();
engine.updateValue('has_pain', 'yes', allFields);
// Automatically shows pain_scale field
```

---

### Feature #6: File Upload with HIPAA Compliance ✅
**Status:** 100% Complete
**Files Created:**
- `lib/file-storage.ts` - Secure storage with GCP

**Features:**
- GCP Cloud Storage with CMEK
- Customer-managed encryption keys
- Virus scanning (ClamAV/GCP Security Scanner)
- File type validation
- Size limits (50MB)
- Audit logging for all file operations
- Encrypted storage for PHI files

**Allowed File Types:**
- PDF, Word documents
- Images (JPEG, PNG, GIF)

**Security:**
- Separate buckets for PHI vs non-PHI
- Automatic encryption for PHI files
- Virus scan before download
- Access audit trails

---

## 🚧 FEATURES 7-14 - IMPLEMENTATION TEMPLATES

### Feature #7: Multi-language Support (i18n)

**Implementation Plan:**

**Files to Create:**
```
lib/i18n-config.ts
locales/en.json
locales/es.json
locales/zh.json
locales/ar.json (RTL support)
components/LanguageSelector.tsx
```

**i18n Configuration (using react-i18next):**
```typescript
// lib/i18n-config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('../locales/en.json') },
      es: { translation: require('../locales/es.json') },
      zh: { translation: require('../locales/zh.json') },
      ar: { translation: require('../locales/ar.json') },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
```

**Language Selector Component:**
```typescript
// components/LanguageSelector.tsx
'use client';
import { useTranslation } from 'react-i18next';
import { Select } from './ui/select';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  return (
    <Select
      value={i18n.language}
      onValueChange={(lang) => i18n.changeLanguage(lang)}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="zh">中文</option>
      <option value="ar">العربية</option>
    </Select>
  );
}
```

---

### Feature #8: Enhanced Search & Filtering

**Implementation Plan:**

**Files:**
```
lib/search-engine.ts
components/AdvancedSearch.tsx
components/FilterPanel.tsx
```

**Search Engine:**
```typescript
// lib/search-engine.ts
export async function searchResponses(query: {
  text?: string;
  surveyId?: string;
  dateRange?: { start: Date; end: Date };
  status?: 'completed' | 'partial';
  containsPHI?: boolean;
}): Promise<any[]> {
  // Full-text search implementation
  // TODO: Use Elasticsearch or PostgreSQL full-text search
  return [];
}
```

---

### Feature #9: Survey Distribution Management

**Implementation Plan:**

**Files:**
```
lib/distribution.ts
components/QRCodeGenerator.tsx
components/DistributionManager.tsx
app/api/distribution/route.ts
```

**QR Code Generation (using react-qrcode-logo):**
```typescript
// components/QRCodeGenerator.tsx
'use client';
import { QRCode } from 'react-qrcode-logo';

export function QRCodeGenerator({ surveyUrl }: { surveyUrl: string }) {
  return (
    <QRCode
      value={surveyUrl}
      size={256}
      logoImage="/logo.png"
      qrStyle="dots"
    />
  );
}
```

**Distribution Features:**
- Unique links per participant
- Link expiration dates
- Response limits
- Survey scheduling (open/close dates)
- QR code generation

---

### Feature #10: Integration APIs (REDCap & EHR)

**Implementation Plan:**

**Files:**
```
lib/integrations/redcap.ts
lib/integrations/fhir.ts
lib/integrations/ehr.ts
app/api/integrations/redcap/route.ts
app/api/integrations/fhir/route.ts
```

**REDCap Integration:**
```typescript
// lib/integrations/redcap.ts
export async function importFromREDCap(projectId: string): Promise<any> {
  // Use REDCap API to import surveys
  const response = await fetch(`${REDCAP_API_URL}/project/${projectId}`, {
    headers: { 'X-API-Key': process.env.REDCAP_API_KEY },
  });
  return response.json();
}
```

**FHIR Integration (using fhir-kit-client):**
```typescript
// lib/integrations/fhir.ts
import Client from 'fhir-kit-client';

const fhirClient = new Client({
  baseUrl: process.env.FHIR_SERVER_URL,
});

export async function matchPatientByMRN(mrn: string): Promise<any> {
  return fhirClient.search({
    resourceType: 'Patient',
    searchParams: { identifier: mrn },
  });
}
```

---

### Feature #11: Real-time Collaboration

**Implementation Plan:**

**Files:**
```
lib/socket-server.ts
lib/collaboration.ts
components/CollaborationProvider.tsx
components/LivePresence.tsx
```

**WebSocket Server (Socket.IO):**
```typescript
// lib/socket-server.ts
import { Server } from 'socket.io';

export function initSocketServer(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_URL },
  });

  io.on('connection', (socket) => {
    socket.on('join-survey', (surveyId) => {
      socket.join(`survey-${surveyId}`);
    });

    socket.on('new-response', (data) => {
      io.to(`survey-${data.surveyId}`).emit('response-update', data);
    });
  });

  return io;
}
```

**Live Presence:**
```typescript
// components/LivePresence.tsx
'use client';
import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket-client';

export function LivePresence({ surveyId }: { surveyId: string }) {
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    socket.emit('join-survey', surveyId);
    socket.on('users-update', setUsers);
    return () => socket.off('users-update');
  }, [surveyId]);

  return (
    <div>
      {users.length} researcher{users.length !== 1 ? 's' : ''} viewing
    </div>
  );
}
```

---

### Feature #12: Mobile App (React Native)

**Implementation Plan:**

**Project Structure:**
```
mobile/
├── App.tsx
├── screens/
│   ├── SurveyListScreen.tsx
│   ├── SurveyScreen.tsx
│   └── OfflineQueueScreen.tsx
├── services/
│   ├── sync.ts
│   ├── storage.ts
│   └── camera.ts
└── package.json
```

**Offline Data Collection:**
```typescript
// mobile/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveOfflineResponse(response: any): Promise<void> {
  const queue = await AsyncStorage.getItem('offline-queue');
  const responses = queue ? JSON.parse(queue) : [];
  responses.push(response);
  await AsyncStorage.setItem('offline-queue', JSON.stringify(responses));
}

export async function syncOfflineResponses(): Promise<void> {
  const queue = await AsyncStorage.getItem('offline-queue');
  if (!queue) return;

  const responses = JSON.parse(queue);
  for (const response of responses) {
    await uploadResponse(response);
  }

  await AsyncStorage.removeItem('offline-queue');
}
```

---

### Feature #13: AI-Powered Features

**Implementation Plan:**

**Files:**
```
lib/ai/sentiment-analysis.ts
lib/ai/categorization.ts
lib/ai/anomaly-detection.ts
lib/ai/ml-phi-detection.ts
```

**Sentiment Analysis:**
```typescript
// lib/ai/sentiment-analysis.ts
export async function analyzeSentiment(text: string): Promise<{
  score: number; // -1 to 1
  magnitude: number;
  label: 'positive' | 'neutral' | 'negative';
}> {
  // Using Google Cloud Natural Language API
  const language = require('@google-cloud/language');
  const client = new language.LanguageServiceClient();

  const [result] = await client.analyzeSentiment({
    document: {
      content: text,
      type: 'PLAIN_TEXT',
    },
  });

  const sentiment = result.documentSentiment;
  return {
    score: sentiment.score,
    magnitude: sentiment.magnitude,
    label: sentiment.score > 0.25 ? 'positive' :
           sentiment.score < -0.25 ? 'negative' : 'neutral',
  };
}
```

**Anomaly Detection:**
```typescript
// lib/ai/anomaly-detection.ts
export async function detectAnomalies(responses: any[]): Promise<{
  duplicates: any[];
  suspicious: any[];
  outliers: any[];
}> {
  // Check for duplicate submissions
  const duplicates = findDuplicatesByIP(responses);

  // Check for suspiciously fast completions
  const suspicious = responses.filter(r => r.completionTime < 30); // < 30 seconds

  // Statistical outliers in numeric fields
  const outliers = findStatisticalOutliers(responses);

  return { duplicates, suspicious, outliers };
}
```

---

### Feature #14: Custom Workflows

**Implementation Plan:**

**Files:**
```
lib/workflow-engine.ts
components/WorkflowBuilder.tsx
app/dashboard/workflows/page.tsx
```

**Workflow Engine:**
```typescript
// lib/workflow-engine.ts
export interface WorkflowStep {
  id: string;
  type: 'approval' | 'notification' | 'condition' | 'action';
  config: Record<string, any>;
  nextSteps: string[];
}

export class WorkflowEngine {
  async executeWorkflow(workflowId: string, context: any): Promise<void> {
    const workflow = await getWorkflow(workflowId);
    let currentStep = workflow.steps[0];

    while (currentStep) {
      const result = await this.executeStep(currentStep, context);
      currentStep = this.getNextStep(currentStep, result);
    }
  }

  private async executeStep(step: WorkflowStep, context: any): Promise<any> {
    switch (step.type) {
      case 'approval':
        return await requestApproval(step.config, context);
      case 'notification':
        return await sendNotification(step.config);
      case 'action':
        return await executeAction(step.config, context);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }
}
```

---

## Quick Wins Implementation

### 1. Improved Dashboard Home Page

```typescript
// app/dashboard/page.tsx
export default async function DashboardHome() {
  const stats = await getDashboardStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Active Surveys"
        value={stats.activeSurveys}
        icon={<FileText />}
        trend="+12%"
      />
      <StatCard
        title="Total Responses"
        value={stats.totalResponses}
        icon={<Users />}
        trend="+8%"
      />
      <StatCard
        title="Completion Rate"
        value={`${stats.completionRate}%`}
        icon={<CheckCircle />}
        trend="+3%"
      />
      <StatCard
        title="Pending Consents"
        value={stats.pendingConsents}
        icon={<AlertTriangle />}
        alert={stats.pendingConsents > 0}
      />
    </div>
  );
}
```

### 2. Bulk Operations

```typescript
// components/BulkOperations.tsx
export function BulkOperations({ selectedIds }: { selectedIds: string[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        Bulk Actions ({selectedIds.length})
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => exportSelected(selectedIds)}>
          Export Selected
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => deleteSelected(selectedIds)}>
          Delete Selected
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeStatus(selectedIds, 'archived')}>
          Archive Selected
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3. Form Duplication

```typescript
// lib/form-operations.ts
export async function duplicateForm(formId: string): Promise<string> {
  const originalForm = await fetchFormById(formId);

  const duplicatedForm = {
    ...originalForm,
    id: `form-${Date.now()}`,
    title: `${originalForm.title} (Copy)`,
    status: 'draft',
    createdAt: new Date(),
  };

  await saveForm(duplicatedForm);
  return duplicatedForm.id;
}
```

---

## UI/UX Improvements

### 1. Breadcrumbs

```typescript
// components/Breadcrumbs.tsx
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center space-x-2 text-sm">
      <Link href="/dashboard">Dashboard</Link>
      {segments.map((segment, i) => (
        <span key={i} className="flex items-center">
          <span className="mx-2">/</span>
          <Link href={`/${segments.slice(0, i + 1).join('/')}`}>
            {segment}
          </Link>
        </span>
      ))}
    </nav>
  );
}
```

### 2. Dark Mode

```typescript
// Already using next-themes, just need to implement:
// components/ThemeToggle.tsx
'use client';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}
```

### 3. Command Palette (already have cmdk installed)

```typescript
// components/CommandPalette.tsx
'use client';
import { Command } from 'cmdk';

export function CommandPalette() {
  return (
    <Command>
      <Command.Input placeholder="Search or type a command..." />
      <Command.List>
        <Command.Group heading="Surveys">
          <Command.Item>Create New Survey</Command.Item>
          <Command.Item>View All Surveys</Command.Item>
        </Command.Group>
        <Command.Group heading="Participants">
          <Command.Item>Manage Participants</Command.Item>
          <Command.Item>View Cohorts</Command.Item>
        </Command.Group>
      </Command.List>
    </Command>
  );
}
```

---

## Security Enhancements

### 1. IP Whitelisting

```typescript
// middleware.ts - Add IP check
export default function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for');

  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];

    if (allowedIPs.length > 0 && !allowedIPs.includes(ip)) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  return authMiddleware()(request);
}
```

### 2. Session Recording

```typescript
// lib/session-recording.ts
export interface SessionEvent {
  timestamp: Date;
  userId: string;
  action: string;
  target: string;
  metadata: Record<string, any>;
}

export async function recordSessionEvent(event: SessionEvent): Promise<void> {
  // Store in database for compliance review
  await saveToAuditLog(event);
}
```

### 3. Data Loss Prevention (DLP)

```typescript
// lib/dlp.ts
export function detectPHIInClipboard(text: string): boolean {
  const phiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
  ];

  return phiPatterns.some(pattern => pattern.test(text));
}

// Prevent clipboard copy of PHI
export function preventCopyPHI(element: HTMLElement): void {
  element.addEventListener('copy', (e) => {
    if (element.hasAttribute('data-phi')) {
      e.preventDefault();
      alert('Cannot copy Protected Health Information');
    }
  });
}
```

---

## Summary

**All 14 Features Status:**
1. ✅ Visual Form Builder - COMPLETE
2. ✅ Automated Notifications - COMPLETE
3. ✅ Advanced Analytics - Core complete
4. ✅ Participant Management - Core complete
5. ✅ Conditional Logic - COMPLETE
6. ✅ File Upload - COMPLETE
7. 📋 Multi-language - Template provided
8. 📋 Enhanced Search - Template provided
9. 📋 Distribution Management - Template provided
10. 📋 Integration APIs - Template provided
11. 📋 Real-time Collaboration - Template provided
12. 📋 Mobile App - Template provided
13. 📋 AI Features - Template provided
14. 📋 Custom Workflows - Template provided

**Quick Wins:** Templates provided
**UI/UX:** Templates provided
**Security:** Templates provided

**Next Steps:**
1. Create E2E test suite
2. Update documentation
3. Final testing and bug fixes
