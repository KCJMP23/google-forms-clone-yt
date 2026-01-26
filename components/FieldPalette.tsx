'use client';

import { FieldType } from '@/lib/form-builder-types';
import { Button } from './ui/button';
import {
  Type,
  Mail,
  Hash,
  Phone,
  FileText,
  List,
  CheckSquare,
  Circle,
  Calendar,
  Clock,
  Upload,
  PenTool,
  Star,
  Sliders,
  Table,
} from 'lucide-react';

interface FieldPaletteProps {
  onAddField: (fieldType: FieldType) => void;
}

const fieldTypes: Array<{
  type: FieldType;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    type: 'text',
    label: 'Text',
    icon: <Type className="w-4 h-4" />,
    description: 'Short text input',
  },
  {
    type: 'textarea',
    label: 'Long Text',
    icon: <FileText className="w-4 h-4" />,
    description: 'Multi-line text',
  },
  {
    type: 'email',
    label: 'Email',
    icon: <Mail className="w-4 h-4" />,
    description: 'Email address',
  },
  {
    type: 'number',
    label: 'Number',
    icon: <Hash className="w-4 h-4" />,
    description: 'Numeric input',
  },
  {
    type: 'tel',
    label: 'Phone',
    icon: <Phone className="w-4 h-4" />,
    description: 'Phone number',
  },
  {
    type: 'select',
    label: 'Dropdown',
    icon: <List className="w-4 h-4" />,
    description: 'Select from options',
  },
  {
    type: 'radio',
    label: 'Radio Buttons',
    icon: <Circle className="w-4 h-4" />,
    description: 'Choose one option',
  },
  {
    type: 'checkbox',
    label: 'Checkboxes',
    icon: <CheckSquare className="w-4 h-4" />,
    description: 'Choose multiple',
  },
  {
    type: 'date',
    label: 'Date',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Date picker',
  },
  {
    type: 'time',
    label: 'Time',
    icon: <Clock className="w-4 h-4" />,
    description: 'Time picker',
  },
  {
    type: 'file',
    label: 'File Upload',
    icon: <Upload className="w-4 h-4" />,
    description: 'Upload files',
  },
  {
    type: 'signature',
    label: 'Signature',
    icon: <PenTool className="w-4 h-4" />,
    description: 'Digital signature',
  },
  {
    type: 'rating',
    label: 'Rating',
    icon: <Star className="w-4 h-4" />,
    description: 'Star rating',
  },
  {
    type: 'slider',
    label: 'Slider',
    icon: <Sliders className="w-4 h-4" />,
    description: 'Range slider',
  },
  {
    type: 'matrix',
    label: 'Matrix',
    icon: <Table className="w-4 h-4" />,
    description: 'Grid of questions',
  },
];

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">Add Fields</h3>
      {fieldTypes.map((field) => (
        <Button
          key={field.type}
          variant="outline"
          className="w-full justify-start text-left h-auto py-3"
          onClick={() => onAddField(field.type)}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{field.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-sm">{field.label}</div>
              <div className="text-xs text-gray-500">{field.description}</div>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
