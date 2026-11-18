'use strict';

exports.injectCompanyId = (req, res, next) => {
  const companyId = req.user && req.user.company_id;

  if (companyId === null || companyId === undefined) {
    return res.status(403).json({ success: false, message: 'บัญชีนี้ยังไม่ได้ผูกกับบริษัท กรุณาติดต่อผู้ดูแลระบบ' });
  }

  const numericCompanyId = parseInt(companyId, 10);
  if (isNaN(numericCompanyId)) {
    return res.status(403).json({ success: false, message: 'บัญชีนี้ยังไม่ได้ผูกกับบริษัท กรุณาติดต่อผู้ดูแลระบบ' });
  }

  req.companyId = numericCompanyId;

  if (req.body && typeof req.body === 'object') {
    req.body.company_id = numericCompanyId;
  }

  next();
};
