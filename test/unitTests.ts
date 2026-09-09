import { ModelRouter } from '../src/main/ai/router/modelRouter';
import { MathEngine } from '../src/main/ai/prompts/mathEngine';
import { IPCGuard } from '../src/main/security/ipcGuard';
import { ProviderRegistry } from '../src/main/ai/providers/providerRegistry';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`[PASS] ${msg}`);
}

async function runTests() {
  console.log('=== Running Astra Copilot Automated Tests ===\n');

  // 1. Model Router Category Classification Tests
  console.log('--- 1. Testing ModelRouter Classification ---');
  assert(
    ModelRouter.classifyPrompt('Write a python function to invert a binary tree') === 'programming',
    'Programming intent recognized'
  );
  assert(
    ModelRouter.classifyPrompt('TypeError: Cannot read properties of undefined (reading "map")') === 'debugging',
    'Debugging intent recognized'
  );
  assert(
    ModelRouter.classifyPrompt('A train 120m long travels at 60 km/h. How long to cross a platform of 180m?') === 'aptitude',
    'Aptitude intent recognized'
  );
  assert(
    ModelRouter.classifyPrompt('Solve the quadratic equation 2x^2 + 5x - 3 = 0') === 'mathematics',
    'Mathematics intent recognized'
  );
  assert(
    ModelRouter.classifyPrompt('What is the current stock price of Apple today?') === 'current_information',
    'Current information / web search intent recognized'
  );
  assert(
    ModelRouter.classifyPrompt('Summarize the key takeaways of the meeting notes') === 'summarization',
    'Summarization intent recognized'
  );
  assert(
    ModelRouter.classifyPrompt('Write a professional cover letter for a senior software engineer') === 'writing',
    'Writing intent recognized'
  );
  assert(
    ModelRouter.classifyPrompt('Analyze the trade-offs and compare microservices vs monolithic architectures') === 'reasoning',
    'Reasoning intent recognized'
  );

  // 2. Math Engine Arithmetic & Step Verification Tests
  console.log('\n--- 2. Testing MathEngine ---');
  assert(MathEngine.evaluateSafe('150 + 250') === 400, 'Basic addition');
  assert(MathEngine.evaluateSafe('(180 + 120) / (60 * (5/18))') !== null, 'Complex formula evaluation');
  assert(MathEngine.evaluateSafe('2^3 + 4 * 5') === 28, 'Power and operator precedence');
  assert(MathEngine.verifyStep('100 * 1.18', 118) === true, 'Verification of correct claimed answer');
  assert(MathEngine.verifyStep('100 * 1.18', 125) === false, 'Detection of incorrect claimed answer');

  // 3. IPC Guard Sanitization Tests
  console.log('\n--- 3. Testing IPCGuard ---');
  assert(IPCGuard.sanitizeString('   hello world   ') === '   hello world   ', 'String preserved');
  assert(IPCGuard.sanitizeString(12345 as any) === '', 'Non-string rejected');
  assert(IPCGuard.sanitizeId('conv_123-abc!@#$%') === 'conv_123-abc', 'Invalid characters stripped from ID');
  assert(IPCGuard.validateMode('coding') === 'coding', 'Valid mode accepted');
  assert(IPCGuard.validateMode('malicious_mode') === 'normal', 'Invalid mode falls back to normal');
  assert(IPCGuard.validateNumber(0.8, 0, 1, 0.7) === 0.8, 'Valid number passed');
  assert(IPCGuard.validateNumber(99, 0, 1, 0.7) === 0.7, 'Out of bounds number clamped to fallback');

  // 4. Provider Registry & Model Catalog Tests
  console.log('\n--- 4. Testing ProviderRegistry & Model Catalog ---');
  const registry = ProviderRegistry.getInstance();
  const allModels = registry.getAllModels();
  assert(allModels.length >= 8, `Provider registry loaded ${allModels.length} models`);
  assert(allModels.some((m) => m.provider === 'openai'), 'OpenAI models registered');
  assert(allModels.some((m) => m.provider === 'gemini'), 'Gemini models registered');
  assert(allModels.some((m) => m.provider === 'anthropic'), 'Anthropic models registered');

  console.log('\n=== ALL AUTOMATED TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
