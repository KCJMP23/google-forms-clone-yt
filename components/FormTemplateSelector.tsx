'use client';

import { useState } from 'react';
import { FORM_TEMPLATES, FormTemplate } from '@/lib/form-builder-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { FileText, Heart, Clipboard, Activity } from 'lucide-react';

interface FormTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: FormTemplate) => void;
}

const categoryIcons = {
  'patient-intake': Clipboard,
  'satisfaction': Heart,
  'consent': FileText,
  'screening': Activity,
  'research': FileText,
  'feedback': Heart,
};

export function FormTemplateSelector({ open, onClose, onSelect }: FormTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = selectedCategory
    ? FORM_TEMPLATES.filter((t) => t.category === selectedCategory)
    : FORM_TEMPLATES;

  const categories = Array.from(new Set(FORM_TEMPLATES.map((t) => t.category)));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Templates
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.replace('-', ' ')}
              </Button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const Icon = categoryIcons[template.category] || FileText;
              return (
                <Card
                  key={template.id}
                  className="p-4 hover:shadow-lg cursor-pointer transition-shadow"
                  onClick={() => {
                    onSelect(template);
                    onClose();
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded">
                      <Icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.isPHI && (
                          <Badge variant="secondary" className="text-xs">
                            PHI
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {template.sections.length} section(s) •{' '}
                        {template.sections.reduce((acc, s) => acc + s.fields.length, 0)} field(s)
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Blank Template */}
          <Card
            className="p-4 hover:shadow-lg cursor-pointer transition-shadow border-dashed"
            onClick={() => {
              onClose();
            }}
          >
            <div className="text-center py-4">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <h3 className="font-semibold">Start from Blank</h3>
              <p className="text-sm text-gray-600">Create a custom form from scratch</p>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
