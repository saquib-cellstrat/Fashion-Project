const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/lib/image/mlsWarp.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const det = P11 \* P22 - P12 \* P12;\n\s+if \(Math\.abs\(det\) < 1e-8\) \{\n\s+vertices\[idx\+\+\] = vx - pStarX \+ qStarX;\n\s+vertices\[idx\+\+\] = vy - pStarY \+ qStarY;\n\s+continue;\n\s+\}/,
  `const det = P11 * P22 - P12 * P12;
        if (Math.abs(det) < 1e-8) {
          // Fall back to similarity math
          const f_A = Q11 + Q22;
          const f_B = Q12 - Q21;
          const mu = P11 + P22;
          
          if (mu < 1e-8) {
             vertices[idx++] = vx - pStarX + qStarX;
             vertices[idx++] = vy - pStarY + qStarY;
             continue;
          }
          
          const factor = 1.0 / mu;
          const v_minus_p_x = vx - pStarX;
          const v_minus_p_y = vy - pStarY;
          
          vertices[idx++] = (v_minus_p_x * f_A - v_minus_p_y * f_B) * factor + qStarX;
          vertices[idx++] = (v_minus_p_y * f_A + v_minus_p_x * f_B) * factor + qStarY;
          continue;
        }`
);

fs.writeFileSync(file, code);
