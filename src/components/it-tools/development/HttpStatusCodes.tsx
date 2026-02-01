import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusCode {
  code: number;
  name: string;
  description: string;
  category: '1xx' | '2xx' | '3xx' | '4xx' | '5xx';
}

const HTTP_STATUS_CODES: StatusCode[] = [
  // 1xx Informational
  { code: 100, name: 'Continue', description: 'Server received request headers', category: '1xx' },
  { code: 101, name: 'Switching Protocols', description: 'Server switching protocols', category: '1xx' },
  // 2xx Success
  { code: 200, name: 'OK', description: 'Request succeeded', category: '2xx' },
  { code: 201, name: 'Created', description: 'Resource created successfully', category: '2xx' },
  { code: 202, name: 'Accepted', description: 'Request accepted for processing', category: '2xx' },
  { code: 204, name: 'No Content', description: 'No content to return', category: '2xx' },
  // 3xx Redirection
  { code: 301, name: 'Moved Permanently', description: 'Resource moved permanently', category: '3xx' },
  { code: 302, name: 'Found', description: 'Resource found at different URI', category: '3xx' },
  { code: 304, name: 'Not Modified', description: 'Resource not modified', category: '3xx' },
  { code: 307, name: 'Temporary Redirect', description: 'Temporary redirect', category: '3xx' },
  { code: 308, name: 'Permanent Redirect', description: 'Permanent redirect', category: '3xx' },
  // 4xx Client Errors
  { code: 400, name: 'Bad Request', description: 'Malformed request syntax', category: '4xx' },
  { code: 401, name: 'Unauthorized', description: 'Authentication required', category: '4xx' },
  { code: 403, name: 'Forbidden', description: 'Access denied', category: '4xx' },
  { code: 404, name: 'Not Found', description: 'Resource not found', category: '4xx' },
  { code: 405, name: 'Method Not Allowed', description: 'HTTP method not allowed', category: '4xx' },
  { code: 408, name: 'Request Timeout', description: 'Request timed out', category: '4xx' },
  { code: 409, name: 'Conflict', description: 'Request conflicts with current state', category: '4xx' },
  { code: 422, name: 'Unprocessable Entity', description: 'Semantic errors in request', category: '4xx' },
  { code: 429, name: 'Too Many Requests', description: 'Rate limit exceeded', category: '4xx' },
  // 5xx Server Errors
  { code: 500, name: 'Internal Server Error', description: 'Server encountered an error', category: '5xx' },
  { code: 501, name: 'Not Implemented', description: 'Server does not support functionality', category: '5xx' },
  { code: 502, name: 'Bad Gateway', description: 'Invalid response from upstream', category: '5xx' },
  { code: 503, name: 'Service Unavailable', description: 'Server temporarily unavailable', category: '5xx' },
  { code: 504, name: 'Gateway Timeout', description: 'Upstream server timeout', category: '5xx' },
];

const HttpStatusCodes: React.FC = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const filteredCodes = useMemo(() => {
    if (!search) return HTTP_STATUS_CODES;
    const query = search.toLowerCase();
    return HTTP_STATUS_CODES.filter(
      (s) =>
        s.code.toString().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
    );
  }, [search]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case '1xx': return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      case '2xx': return 'bg-green-500/20 text-green-600 border-green-500/30';
      case '3xx': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
      case '4xx': return 'bg-orange-500/20 text-orange-600 border-orange-500/30';
      case '5xx': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return '';
    }
  };

  const groupedCodes = useMemo(() => {
    const groups: Record<string, StatusCode[]> = {};
    filteredCodes.forEach((code) => {
      if (!groups[code.category]) groups[code.category] = [];
      groups[code.category].push(code);
    });
    return groups;
  }, [filteredCodes]);

  const categoryLabels: Record<string, string> = {
    '1xx': 'Informational',
    '2xx': 'Success',
    '3xx': 'Redirection',
    '4xx': 'Client Error',
    '5xx': 'Server Error',
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('itTools.searchStatusCode')}
          className="ps-10"
        />
      </div>

      <div className="space-y-6 max-h-96 overflow-y-auto">
        {Object.entries(groupedCodes).map(([category, codes]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1">
              <Badge className={cn('border', getCategoryColor(category))}>
                {category}
              </Badge>
              <span className="text-sm text-muted-foreground">{categoryLabels[category]}</span>
            </div>
            <div className="space-y-2">
              {codes.map((status) => (
                <div
                  key={status.code}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Badge variant="outline" className={cn('font-mono', getCategoryColor(status.category))}>
                    {status.code}
                  </Badge>
                  <div>
                    <p className="font-medium">{status.name}</p>
                    <p className="text-sm text-muted-foreground">{status.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HttpStatusCodes;
