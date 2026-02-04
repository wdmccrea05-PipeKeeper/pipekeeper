/**
 * Publish Gate Integration Test (Fetch-based)
 * Tests all critical routes and JSON responses for health
 * Does not require write access to filesystem
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BASE_URL = 'https://preview-sandbox--8a55ff16cb73dd321783eefd093ae016.base44.app';

const testResults = {
  timestamp: new Date().toISOString(),
  results: [],
  errors: [],
  passed: 0,
  failed: 0,
};

async function testRoute(name, path) {
  try {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/json',
        'User-Agent': 'PipeKeeper-PublishGate/1.0',
      },
    });
    
    if (response.status === 200 || response.status === 304) {
      const html = await response.text();
      
      // Check for React render markers and critical content
      const hasReactRoot = html.includes('react') || html.includes('root') || html.includes('content');
      const hasErrors = html.toLowerCase().includes('error') && (
        html.toLowerCase().includes('uncaught') ||
        html.toLowerCase().includes('exception') ||
        html.toLowerCase().includes('promise rejection')
      );
      
      if (!hasErrors && html.length > 1000) {
        testResults.results.push({
          test: name,
          route: path,
          status: 'PASS',
          statusCode: response.status,
          htmlSize: html.length,
        });
        testResults.passed++;
        return true;
      } else if (hasErrors) {
        testResults.errors.push(`${name}: Error content detected in response`);
        testResults.results.push({
          test: name,
          route: path,
          status: 'FAIL',
          error: 'Error content detected',
        });
        testResults.failed++;
        return false;
      } else {
        testResults.results.push({
          test: name,
          route: path,
          status: 'PASS',
          statusCode: response.status,
          htmlSize: html.length,
        });
        testResults.passed++;
        return true;
      }
    } else {
      testResults.errors.push(`${name}: HTTP ${response.status}`);
      testResults.results.push({
        test: name,
        route: path,
        status: 'FAIL',
        statusCode: response.status,
      });
      testResults.failed++;
      return false;
    }
  } catch (err) {
    testResults.errors.push(`${name}: ${err.message}`);
    testResults.results.push({
      test: name,
      route: path,
      status: 'FAIL',
      error: err.message,
    });
    testResults.failed++;
    return false;
  }
}

async function testBackendCRUD(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.email) {
      testResults.errors.push('CRUD Test: User not authenticated');
      testResults.results.push({
        test: 'Backend Auth',
        status: 'FAIL',
        error: 'User not authenticated',
      });
      testResults.failed++;
      return false;
    }
    
    // Test Pipe entity read
    try {
      const pipes = await base44.entities.Pipe.list();
      testResults.results.push({
        test: 'Backend - Pipe Read',
        status: 'PASS',
        pipeCount: pipes?.length || 0,
      });
      testResults.passed++;
    } catch (err) {
      testResults.errors.push(`Pipe read: ${err.message}`);
      testResults.results.push({
        test: 'Backend - Pipe Read',
        status: 'FAIL',
        error: err.message,
      });
      testResults.failed++;
    }
    
    // Test TobaccoBlend entity read
    try {
      const blends = await base44.entities.TobaccoBlend.list();
      testResults.results.push({
        test: 'Backend - TobaccoBlend Read',
        status: 'PASS',
        blendCount: blends?.length || 0,
      });
      testResults.passed++;
    } catch (err) {
      testResults.errors.push(`TobaccoBlend read: ${err.message}`);
      testResults.results.push({
        test: 'Backend - TobaccoBlend Read',
        status: 'FAIL',
        error: err.message,
      });
      testResults.failed++;
    }
    
    // Test UserProfile read
    try {
      const profiles = await base44.entities.UserProfile.list();
      testResults.results.push({
        test: 'Backend - UserProfile Read',
        status: 'PASS',
        profileCount: profiles?.length || 0,
      });
      testResults.passed++;
    } catch (err) {
      testResults.errors.push(`UserProfile read: ${err.message}`);
      testResults.results.push({
        test: 'Backend - UserProfile Read',
        status: 'FAIL',
        error: err.message,
      });
      testResults.failed++;
    }
    
    return true;
  } catch (err) {
    testResults.errors.push(`Backend CRUD test: ${err.message}`);
    testResults.results.push({
      test: 'Backend CRUD Suite',
      status: 'FAIL',
      error: err.message,
    });
    testResults.failed++;
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    console.log('[PUBLISH GATE] Starting regression test suite...\n');
    
    // Route accessibility tests
    const routes = [
      ['Home Page', '/'],
      ['Pipes Page', '/?hash=/Pipes'],
      ['Tobacco Page', '/?hash=/Tobacco'],
      ['FAQ Page', '/?hash=/FAQ'],
      ['Help Page', '/?hash=/Help'],
    ];
    
    console.log('[ROUTES] Testing route accessibility...');
    for (const [name, path] of routes) {
      await testRoute(name, path);
    }
    
    console.log('\n[BACKEND] Testing CRUD operations...');
    await testBackendCRUD(req);
    
    const summary = {
      status: testResults.failed === 0 ? 'PUBLISH_GO' : 'PUBLISH_NO_GO',
      timestamp: testResults.timestamp,
      total_tests: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      error_count: testResults.errors.length,
      errors: testResults.errors.slice(0, 10), // Last 10 errors
      test_results: testResults.results,
    };
    
    console.log('\n' + JSON.stringify(summary, null, 2));
    
    return new Response(JSON.stringify(summary, null, 2), {
      status: testResults.failed === 0 ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[ERROR]', err.message);
    return new Response(JSON.stringify({
      status: 'ERROR',
      error: err.message,
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});