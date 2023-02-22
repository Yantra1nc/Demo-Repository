/**
 *@NApiVersion 2.1
 * @NModuleScope Public
 */

/*************************************************************
Library Name: YIL_LIB_CommonFunctions.js
Created Date: 16/11/2022
Created By: Nikita Shinde
Company : Yantra Inc.
Description: Created this Common Library file to store common functions to shrink line of code and to increase functions reusability.
*************************************************************/


define(['N/record', 'N/runtime', 'N/search', 'N/file', 'N/sftp', 'N/log', 'N/config', 'N/email', 'SuiteScripts/moment_timezone_with_data.js', 'N/error', "N/task"], function (record, runtime, search, file, sftp, log, config, email, moment, error, task) {

	var url = 'fantasy.luganodiamonds.com';
	var hostKey = 'AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBHeZkOOfYyheIVdgneWlZLpmKvWXwlxOo/UbwKhPIBvknvk70iuLANCBE406l3xMIz83pdYMCW+x+U8C+kLyLXc=';
	var username = 'NetSuiteProd';
	var port = 22;


	function _validateData(val) {
		if (val != 'Null' && val != 'null' && val != null && val != 'undefined' && val != 'NaN' && val != '') {
			return true;
		}
		return false;
	}
	function _validateNumberStatus(val) {
		var ret = { 'status': false, 'val': 0 };
		//if (val == '0') console.LOG('got zero');
		//if (val == '') console.LOG('got blank');
		if (val != null && val != 'undefined' && val != 'NaN') {
			if (val == '0') { ret = { 'status': true, 'val': 0 } }
			else if (val != '') {
				if (!isNaN(Number(val))) {
					ret = { 'status': true, 'val': Number(val) };
				}
			}
		}
		return ret;
	}

	function moveErrorFiletoSFTP(passwordGuid, directory, fileObj, file_name) {
		try {
			log.debug({ title: 'moveErrorFiletoSFTP : START' });
			var objConnection = sftp.createConnection({
				url: url,
				passwordGuid: passwordGuid,
				hostKey: hostKey,
				username: username,
				port: port,
				directory: directory
			});
			log.debug('objConnection', objConnection);

			var uploadfile = objConnection.upload({
				//directory: '/remittanceIN/',					
				filename: file_name,
				file: fileObj,
				replaceExisting: true
			});
			log.debug('uploadfile', uploadfile);

		} catch (errObj) {
			log.error({ title: 'moveErrorFiletoSFTP : errObj', details: errObj });
		}
	}

	// Function is used to get all the search results. Max result will be 10000 in batch of 1000
	function getAllSearchResults(SavedSearch) {
		try {
			var index = 0;
			var maxSearchReturn = 1000;
			var maxResults = 10000;
			var AllSearchResults = [];

			var searchResCount = SavedSearch.runPaged().count;
			//log.debug("SavedSearch result count",searchResCount);

			var Resultset = SavedSearch.run();

			do {
				var start = index;
				var end = index + maxSearchReturn;
				if (maxResults && maxResults <= end) {
					end = maxResults;
				}
				// log.debug('start = '+start, 'end = '+end);

				ResultSubSet = Resultset.getRange(start, end);
				if (ResultSubSet == null || ResultSubSet.length <= 0) {
					break;
				}
				AllSearchResults = AllSearchResults.concat(ResultSubSet);
				index = index + ResultSubSet.length;

				if (maxResults && maxResults == index) {
					break;
				}
			}
			while (ResultSubSet.length >= maxSearchReturn);

			return AllSearchResults;
		} catch (e) { log.debug("Error In getAllSearchResults", e); }
	}

	function createCSVFile(context) {
		try {
			var passwordGuid = '0a78993c0a714a1880250e50f017158e';
			var directory = '/NetSuite Integration/Item/Error/';

			var filecontents = 'Error' + ',' + 'LOT ID' + ',' + 'LOT Name' + ',' + 'Item Type' + ',' + 'Section' + ',' + 'Category Id' + ',' + 'Sub Category Id';

			var totalRows = 0;
			var fileNm = new Object();

			context.output.iterator().each(function (key, value) {
				if (!fileNm[key]) {
					fileNm[key] = [];
				}
				if (value) {
					fileNm[key].push('\n' + value);
				}
				totalRows++;
				return true;
			});
			if (totalRows > 0) {
				for (const file_name in fileNm) {
					if (Object.hasOwnProperty.call(fileNm, file_name)) {
						const filecontent = fileNm[file_name];

						var fileObj = file.create({
							name: file_name,
							contents: filecontents + filecontent.toString(),
							fileType: 'CSV'
						});

						var file_name_new = "Error_" + file_name;
						if (passwordGuid && directory && fileObj && file_name_new) {
							moveErrorFiletoSFTP(passwordGuid, directory, fileObj, file_name_new);
						}

						//for sending email
						if (fileObj) {
							var userId = "";
							var objUser = runtime.getCurrentUser();
							if (_validateData(objUser)) {
								userId = objUser.id;
							}
							var subject = "Item file : " + file_name.toString();
							var recipient = 'nikita.shinde@yantrainc.com,anup.sonwane@yantrainc.com,ishu@yantrainc.com,Moshe@luganodiamonds.com,vzaura@luganodiamonds.com,NNawaz@luganodiamonds.com';
							var message = "There is an error during processing.Please find the error file attached";
							email.send({
								author: 4,
								//author: userId,
								recipients: recipient,
								subject: subject,
								body: message,
								attachments: [fileObj],
								relatedRecords: {
									entityId: recipient
								}
							});
						}
					}
				}
			}
		} catch (e) { log.debug("Error In Resale createCSVFile", e); }

	}


	//Units Type 
	function unitsTypeSearch(unitname) {
		var unitsTypeFilter = [];
		var unitsTypeColumn = [];
		var UnitTypeId;

		unitsTypeFilter.push(["name", "is", unitname]);

		unitsTypeColumn.push(search.createColumn({ name: "name", label: "Name" }));
		unitsTypeColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));

		var UTSrchObj = search.create({ type: "unitstype", filters: unitsTypeFilter, columns: unitsTypeColumn });

		var UnitsTypeSearchResult = getAllSearchResults(UTSrchObj);
		//log.debug("UnitsTypeSearchResult==",UnitsTypeSearchResult);
		if (_validateData(UnitsTypeSearchResult)) {
			for (var j = 0; j < UnitsTypeSearchResult.length; j++) {
				UnitTypeId = UnitsTypeSearchResult[j].getValue({ name: 'internalid' });
				var UnitTypeName = UnitsTypeSearchResult[j].getValue({ name: 'name' });
			}
		}
		if (UnitsTypeSearchResult.length > 0) {
			return UnitTypeId;
		}
		else {
			return unitname;
		}
	}

	//Department
	function deptSearch(deptname) {
		var deptTypeFilter = [];
		var deptTypeColumn = [];
		var deptId;

		deptTypeFilter.push(["name", "is", deptname]);

		deptTypeColumn.push(search.createColumn({ name: "name", label: "Name" }));
		deptTypeColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));

		var DeptSrchObj = search.create({ type: "department", filters: deptTypeFilter, columns: deptTypeColumn });

		var deptSearchResult = getAllSearchResults(DeptSrchObj);
		//log.debug("deptSearchResult==",deptSearchResult);
		if (_validateData(deptSearchResult)) {
			for (var j = 0; j < deptSearchResult.length; j++) {
				deptId = deptSearchResult[j].getValue({ name: 'internalid' });
				var deptName = deptSearchResult[j].getValue({ name: 'name' });
			}
		}
		if (deptSearchResult.length > 0) {
			return deptId;
		}
		else {
			return deptname;
		}
	}

	//Class
	function classSearch(classname) {
		var classTypeFilter = [];
		var classTypeColumn = [];
		var classId;

		classTypeFilter.push(["name", "is", classname]);

		classTypeColumn.push(search.createColumn({ name: "name", label: "Name" }));
		classTypeColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));

		var classSrchObj = search.create({ type: "class", filters: classTypeFilter, columns: classTypeColumn });

		var ClassSearchResult = getAllSearchResults(classSrchObj);
		//log.debug("ClassSearchResult==",ClassSearchResult);
		if (_validateData(ClassSearchResult)) {
			for (var j = 0; j < ClassSearchResult.length; j++) {
				classId = ClassSearchResult[j].getValue({ name: 'internalid' });
				var className = ClassSearchResult[j].getValue({ name: 'name' });
			}
		}
		if (ClassSearchResult.length > 0) {
			return classId;
		}
		else {
			return classname;
		}
	}

	//Location
	function locSearch(locname) {
		var locTypeFilter = [];
		var locTypeColumn = [];
		var locId;

		locTypeFilter.push(["name", "contains", locname]);

		locTypeColumn.push(search.createColumn({ name: "name", label: "Name" }));
		locTypeColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));
		locTypeColumn.push(search.createColumn({ name: "subsidiary", label: "Subsidiary" }));

		var locSrchObj = search.create({ type: "location", filters: locTypeFilter, columns: locTypeColumn });

		var LocSearchResult = getAllSearchResults(locSrchObj);
		//log.debug("LocSearchResult==",LocSearchResult);
		if (_validateData(LocSearchResult)) {
			for (var j = 0; j < LocSearchResult.length; j++) {
				locId = LocSearchResult[j].getValue({ name: 'internalid' });
				var locName = LocSearchResult[j].getValue({ name: 'name' });
			}
		}
		if (LocSearchResult.length > 0) {
			return locId;
		}
		else {
			return locname;
		}
	}

	// Item Type 

	function itemTypeSearch(itemtype) {
		var itemTypeFilter = [];
		var itemTypeColumn = [];
		var itemtypeId;

		itemTypeFilter.push(["name", "is", itemtype]);

		itemTypeColumn.push(search.createColumn({ name: "name", label: "Name" }));
		itemTypeColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));

		var itemtypeSrchObj = search.create({ type: "customlist_item_type", filters: itemTypeFilter, columns: itemTypeColumn });

		var itemTypeSearchResult = getAllSearchResults(itemtypeSrchObj);
		//log.debug("itemTypeSearchResult==",itemTypeSearchResult);
		if (_validateData(itemTypeSearchResult)) {
			for (var j = 0; j < itemTypeSearchResult.length; j++) {
				itemtypeId = itemTypeSearchResult[j].getValue({ name: 'internalid' });
				var itemtypename = itemTypeSearchResult[j].getValue({ name: 'name' });
			}
		}
		if (itemTypeSearchResult.length > 0) {
			return itemtypeId;
		}
		else {
			return itemtype;
		}
	}

	//Category
	function costCatSearch(costcategname) {
		var costCatFilter = [];
		var costCatColumn = [];
		var costCatId;

		costCatFilter.push(["name", "is", costcategname]);

		costCatColumn.push(search.createColumn({ name: "name", label: "Name" }));
		costCatColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));

		var costCatSrchObj = search.create({ type: "customlist_item_category", filters: costCatFilter, columns: costCatColumn });

		var CostCategorySearchResult = getAllSearchResults(costCatSrchObj);
		//log.debug("CostCategorySearchResult==",CostCategorySearchResult);
		if (_validateData(CostCategorySearchResult)) {
			for (var j = 0; j < CostCategorySearchResult.length; j++) {
				costCatId = CostCategorySearchResult[j].getValue({ name: 'internalid' });
				var costCategname = CostCategorySearchResult[j].getValue({ name: 'name' });
			}
		}
		if (CostCategorySearchResult.length > 0) {
			return costCatId;
		}
		else {
			return costcategname;
		}
	}

	//Sub Category
	function subCatSearch(subcategname) {
		var subCatFilter = [];
		var subCatColumn = [];
		var subCatId;

		subCatFilter.push(["name", "is", subcategname]);

		subCatColumn.push(search.createColumn({ name: "name", label: "Name" }));
		subCatColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));

		var subCatSrchObj = search.create({ type: "customlist_item_sub_category", filters: subCatFilter, columns: subCatColumn });

		var subCategorySearchResult = getAllSearchResults(subCatSrchObj);
		//log.debug("subCategorySearchResult==",subCategorySearchResult);
		if (_validateData(subCategorySearchResult)) {
			for (var j = 0; j < subCategorySearchResult.length; j++) {
				subCatId = subCategorySearchResult[j].getValue({ name: 'internalid' });
				var subCategname = subCategorySearchResult[j].getValue({ name: 'name' });
			}
		}
		if (subCategorySearchResult.length > 0) {
			return subCatId;
		}
		else {
			return subcategname;
		}
	}
	//Section

	function sectionSearch(sectionIdVal) {
		var sectionFilter = [];
		var costCatColumn = [];
		var sectionId;

		//sectionFilter.push(["name", "contains", sectionName]);

		sectionFilter.push(["internalid", "anyof", sectionIdVal]);

		costCatColumn.push(search.createColumn({ name: "name", label: "Name" }));
		costCatColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));

		var sectionSrchObj = search.create({ type: "customlist1045", filters: sectionFilter, columns: costCatColumn });

		var sectionSearchResult = getAllSearchResults(sectionSrchObj);
		//log.debug("sectionSearchResult==",sectionSearchResult);
		if (_validateData(sectionSearchResult)) {
			for (var j = 0; j < sectionSearchResult.length; j++) {
				sectionId = sectionSearchResult[j].getValue({ name: 'internalid' });
				var sectionName = sectionSearchResult[j].getValue({ name: 'name' });
			}
		}
		if (sectionSearchResult.length > 0) {
			return sectionId;
		}
		else {
			return false;
		}
	}

	function item_is_existingornew(itemName) {

		var recordMode = '';

		var itemSearchObj = search.create({
			type: "item",
			filters:
				[
					["name", "is", itemName]
				],
			columns:
				[
					search.createColumn({ name: "internalid", label: "Internal ID" })
				]
		});
		var searchResultCount = itemSearchObj.runPaged().count;
		//log.debug("itemSearchObj result count",searchResultCount);

		if (searchResultCount > 0) {
			itemSearchObj.run().each(function (result) {
				internalID = result.getValue({ name: "internalid" });
			});
			recordMode = "edit";
			return [recordMode, internalID];
		}
		else {
			recordMode = "create";
			return recordMode;
		}

	}

	function getItemInternalId(itemName) {
		var internalId = '';

		var itemSearchObj = search.create({
			type: "item",
			filters: [
				["name", "is", itemName],
			],
			columns: [
				search.createColumn({
					name: "internalid",
					label: "Internal ID"
				}),
			],
		});
		itemSearchObj.run().each(function (result) {
			internalId = result.getValue({
				name: "internalid",
				label: "Internal ID",
			});
			//return true;
		});
		if (internalId != '') {

			return internalId;
		}
		else {

			return false;
		}
	}

	function getVendorInternalId(fantacyID) {
		var internalId = '';
		var fantasyinternalId = '';

		var customerSearchObj = search.create({
			type: "vendor",
			filters: [
				["custentity_fantasy_vendor_id", "is", fantacyID]
			],
			columns: [
				search.createColumn({ name: "internalid", label: "Internal ID" }),
				search.createColumn({ name: "custentity_fantasy_vendor_id", label: "Account ID (Fantasy)" })

			],
		});
		customerSearchObj.run().each(function (result) {
			internalId = result.getValue({ name: "internalid", label: "Internal ID" });
			fantasyinternalId = result.getValue({ name: "custentity_fantasy_vendor_id", label: "Account ID (Fantasy)" });
			//return true;
		});
		if (internalId != '') {
			return internalId;

		}
	}


	function createPOVRCSVErrorFile(context) {
		try {
			var passwordGuid = '12fcd3c49a554a5ab1f461434cdff6f6';
			var directory = '/NetSuite Integration/Purchase Order Vendor Return/Error/'

			var filecontents = 'Error' + ',' + 'Doc Type ID' + ',' + 'Doc Type Desc' + ',' + 'Doc ID' + ',' + 'Ref Doc Number' + ',' + 'Doc Date' + ',' + 'Vendor Account Id' + ',' + 'Doc Account Name' + ',' + 'Lot ID' + ',' + 'DocLinesTotalPrice' + ',' + 'Payment Term ID' + ',' + 'Due Date' + ',' + 'Acc Long Name Loc' + ',' + 'Prnt Lot Id' + ',' + 'Quantity';

			var totalRows = 0;
			var fileNm = new Object();

			context.output.iterator().each(function (key, value) {
				if (!fileNm[key]) {
					fileNm[key] = [];
				}
				if (value) {
					fileNm[key].push('\n' + value);
				}
				totalRows++;

				return true;
			});
			//log.debug("totalRows", totalRows);
			if (totalRows > 0) {
				for (const file_name in fileNm) {
					if (Object.hasOwnProperty.call(fileNm, file_name)) {
						const filecontent = fileNm[file_name];

						var fileObj = file.create({
							name: file_name,
							contents: filecontents + filecontent.toString(),
							fileType: 'CSV'
						});

						var file_name_new = "Error_" + file_name;
						if (passwordGuid && directory && fileObj && file_name_new) {
							moveErrorFiletoSFTP(passwordGuid, directory, fileObj, file_name_new);
						}

						//for sending email
						if (fileObj) {
							var userId = "";
							var objUser = runtime.getCurrentUser();
							if (_validateData(objUser)) {
								userId = objUser.id;
							}
							var subject = "Purchase Order Vendor Return file : " + file_name.toString();
							var recipient = 'nikita.shinde@yantrainc.com,anup.sonwane@yantrainc.com,ishu@yantrainc.com,Moshe@luganodiamonds.com,vzaura@luganodiamonds.com,NNawaz@luganodiamonds.com';
							var message = "There is an error during processing";

							email.send({
								//author: userId,
								author: 4,
								recipients: recipient,
								subject: subject,
								body: message,
								attachments: [fileObj],
								relatedRecords: {
									entityId: recipient
								}
							});
						}
					}
				}
			}
		} catch (e) { log.debug("Error In createPOVRCSVErrorFile", e); }
	}

	//PO Type List
	function poTypeListSearch(poTypeName) {
		var poTypeFilter = [];
		var poTypeColumn = [];
		var poTypeId;

		poTypeFilter.push(["name", "is", poTypeName]);

		poTypeColumn.push(search.createColumn({ name: "name", label: "Name" }));
		poTypeColumn.push(search.createColumn({ name: "internalid", label: "Internal ID" }));

		var poTypeSrchObj = search.create({ type: "customlist_doc_type_desc", filters: poTypeFilter, columns: poTypeColumn });

		var poTypeSrchResult = getAllSearchResults(poTypeSrchObj);
		//log.debug("poTypeSrchResult==",poTypeSrchResult);
		if (_validateData(poTypeSrchResult)) {
			for (var j = 0; j < poTypeSrchResult.length; j++) {
				poTypeId = poTypeSrchResult[j].getValue({ name: 'internalid' });
				var poTypeName = poTypeSrchResult[j].getValue({ name: 'name' });
			}
		}
		if (poTypeSrchResult.length > 0) {
			return poTypeId;
		}
		else {
			return poTypeName;
		}
	}
	function formatDate(dateValue) {
		try {
			var configRecObj = config.load({
				type: 'userpreferences'
			});
			var companyInfoDt = configRecObj.getValue('DATEFORMAT');
			//log.debug("companyInfoDt",companyInfoDt);
			if (_validateData(dateValue)) {
				var libDt = moment(dateValue).format(companyInfoDt);
				return libDt;
			}
		} catch (e) { }
	}

	function getFilesFromSFTP(passwordGuid, directory) {
		try {

			var objConnection = sftp.createConnection({
				url: url,
				passwordGuid: passwordGuid,
				hostKey: hostKey,
				username: username,
				port: port,
				directory: directory
			});

			var arrFiles = objConnection.list();
			log.debug("arrFiles", arrFiles);
			return [objConnection, arrFiles];

		} catch (e) { log.debug("Error In getFilesFromSFTP ", e); }
	}

	function moveToArchiveFolder(passwordGuid, fileName, fromvalue, tovalue) {
		try {
			log.debug({ title: 'moveTo : START' });
			log.debug({ title: 'fromvalue + fileName ', details: fromvalue + fileName });
			log.debug({ title: 'tovalue + fileName ', details: tovalue + fileName });

			var objConnectionX = sftp.createConnection({
				url: url,
				passwordGuid: passwordGuid,
				hostKey: hostKey,
				username: username,
				port: port
			});

			objConnectionX.move({
				from: fromvalue + fileName,
				to: tovalue + fileName
			});

			log.debug({ title: 'moveTo : END' });
		}
		catch (errObj) {
			log.error({ title: 'moveTo : errObj', details: errObj });
		}
	}

	function check_salesrep(Salesrepname) {

		var employeeSearchObj = search.create({
			type: "employee",
			filters:
				[

					["entityid", "is", Salesrepname]
				],
			columns: [
				search.createColumn({ name: "internalid", label: "Internal ID" })
			],
		});
		var resultSet = employeeSearchObj.run()
		var range = resultSet.getRange({
			start: 0,
			end: 1
		});

		var range_length = range.length;
		// log.debug({
		//     title: "Yantra-Log:",
		//     details: "Yantra-Log:" + range_length,
		// });
		if (range_length > 0) {

			var mResult = range[0];
			var internal_ID = mResult.getValue(resultSet.columns[0]);
			// log.audit({
			//     title: "Yantra-Log",
			//     details: "Sales Rep:" + internal_ID,
			// });

			return internal_ID;
		}
		else {

			return null;

		}
	}

	function containsNumber_and_valid_phn(str) {

		//  log.debug({ title: 'str', details: str });
		var length = str.length;
		//  log.debug({ title: 'length', details: length });
		var checknum = /\d/.test(str);

		if (str.length > 6 & checknum) {

			return true;
		}
		else {

			return false;
		}

	}

	function getInternalId_source_transaction(documentNumber) {

		var invoiceSearchObj = search.create({
			type: "invoice",
			filters: [
				["type", "anyof", "CustInvc"],
				"AND",
				["numbertext", "is", documentNumber]
			],
			columns: [

				search.createColumn({ name: "internalid", label: "Internal ID" })
			]
		});
		var invoice_id;

		var searchResultCount = invoiceSearchObj.runPaged().count;
		log.debug("itemSearchObj result count", searchResultCount);

		invoiceSearchObj.run().each(function (result) {

			invoice_id = result.id;
			log.debug('PCT-Log', 'invoice_id search Id: ' + invoice_id);
		});

		return invoice_id;
	}


	function getInternalId_source_transaction_credit(documentNumber) {

		var invoiceSearchObj = search.create({
			type: "creditmemo",
			filters: [
				["type", "anyof", "CustCred"],
				"AND",
				["numbertext", "is", documentNumber]
			],
			columns: [

				search.createColumn({ name: "internalid", label: "Internal ID" })
			]
		});
		var invoice_id;

		var searchResultCount = invoiceSearchObj.runPaged().count;
		log.debug("itemSearchObj result count", searchResultCount);

		invoiceSearchObj.run().each(function (result) {

			invoice_id = result.id;
			log.debug('PCT-Log', 'invoice_id search Id: ' + invoice_id);
		});

		return invoice_id;
	}

	function getLocationId(source) {

		if (source == "Washington D.C.") {
			return 18;
		}
		if (source == "Parent Intercompany Elimination Location") {
			return 17;
		}
		if (source == "Palm Beach") {
			return 12;
		}
		if (source == "Ocala") {
			return 6;
		}
		if (source == "Newport Beach") {
			return 11;
		}
		if (source == "Newport Beach Prive") {
			return 7;
		}
		if (source == "Lugano Intercompany Elimination Location") {
			return 16;
		}
		if (source == "KLD Jewelry") {
			return 13;
		}
		if (source == "Houston") {
			return 10;
		}
		if (source == "NB Diamonds" || source == "Headquarter") {
			return 5;
		}
		if (source == "Greenwich") {
			return 19;
		}
		if (source == "Equestrian") {
			return 8;
		}
		if (source == "Aspen") {
			return 9;
		}

	}
	function doc_Type_Id(docid) {

		var customlistdoc_type_idSearchObj = search.create({
			type: "customlistdoc_type_id",
			filters:
				[
					["name", "is", docid]
				],
			columns:
				[
					search.createColumn({ name: "internalid", label: "Internal ID" }),
					search.createColumn({
						name: "name",
						sort: search.Sort.ASC,
						label: "Name"
					})
				]
		});
		var resultSet = customlistdoc_type_idSearchObj.run()
		var range = resultSet.getRange({
			start: 0,
			end: 1
		});

		var range_length = range.length;

		if (range_length > 0) {

			var mResult = range[0];
			var internal_ID = mResult.getValue(resultSet.columns[0]);

			return internal_ID;
		}
		else {

			return null;

		}
	}
	function paymentTerms(termsname) {

		var termSearchObj = search.create({
			type: "term",
			filters:
				[
					["name", "is", termsname]
				],
			columns:
				[
					search.createColumn({ name: "internalid", label: "Internal ID" }),
					search.createColumn({
						name: "name",
						sort: search.Sort.ASC,
						label: "Name"
					})
				]
		});
		var resultSet = termSearchObj.run()
		var range = resultSet.getRange({
			start: 0,
			end: 1
		});

		var range_length = range.length;

		if (range_length > 0) {

			var mResult = range[0];
			var internal_ID = mResult.getValue(resultSet.columns[0]);

			return internal_ID;
		}
		else {

			return null;

		}
	}

	function doc_Type_Description(docname) {

		var customlist_doc_type_descSearchObj = search.create({
			type: "customlist_doc_type_desc",
			filters:
				[
					["name", "is", docname]
				],
			columns:
				[
					search.createColumn({ name: "internalid", label: "Internal ID" }),
					search.createColumn({
						name: "name",
						sort: search.Sort.ASC,
						label: "Name"
					})
				]
		});
		var resultSet = customlist_doc_type_descSearchObj.run()
		var range = resultSet.getRange({
			start: 0,
			end: 1
		});

		var range_length = range.length;

		if (range_length > 0) {

			var mResult = range[0];
			var internal_ID = mResult.getValue(resultSet.columns[0]);

			return internal_ID;
		}
		else {

			return null;

		}
	}
	function GetCustomerInternalId(cusName) {
		var internalId = '';

		var customerSearchObj = search.create({
			type: "customer",
			filters: [

				["entityid", "is", cusName]
			],
			columns: [
				search.createColumn({
					name: "internalid",
					label: "Internal ID"
				}),
			],
		});
		customerSearchObj.run().each(function (result) {
			internalId = result.getValue({
				name: "internalid",
				label: "Internal ID",
			});
			//return true;
		});
		if (internalId != '') {

			return internalId;

		} else {

			return false;
		}

	}

	function GetCustomerInternalIdByExtenal_id(external_id) {
		var internalId = '';

		var customerSearchObj = search.create({
			type: "customer",
			filters: [

				["custentity_account_id", "is", external_id]
			],
			columns: [
				search.createColumn({
					name: "internalid",
					label: "Internal ID"
				}),
			],
		});
		customerSearchObj.run().each(function (result) {
			internalId = result.getValue({
				name: "internalid",
				label: "Internal ID",
			});
			//return true;
		});
		if (internalId != '') {

			return internalId;

		} else {

			return false;
		}

	}

	function createError(error_name, message) {

		log.debug("Inside error function");

		var errorObj = error.create({
			name: error_name,
			message: message,
			notifyOff: true
		});
		return errorObj;
	}


	function sendEmail(subject, message, recipient, fileObj) {

		log.debug("Inside sendEmail function");

		var email_send = email.send({
			//author: userId,
			author: 4,
			recipients: recipient,
			subject: subject,
			body: message,
			attachments: [fileObj],
			relatedRecords: {
				entityId: recipient
			}
		});
		return email_send;
	}

	const CSVToArray = (strData, strDelimiter) => {
		// Check to see if the delimiter is defined. If not,
		// then default to comma.
		strDelimiter = (strDelimiter || ",");

		// Create a regular expression to parse the CSV values.
		let objPattern = new RegExp(
			(
				// Delimiters.
				"(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

				// Standard fields.
				"([^\"\\" + strDelimiter + "\\r\\n]*))"
			),
			"gi"
		);


		// Create an array to hold our data. Give the array
		// a default empty first row.
		let arrData = [[]];

		// Create an array to hold our individual pattern
		// matching groups.
		let arrMatches = null;


		// Keep looping over the regular expression matches
		// until we can no longer find a match.
		while (arrMatches = objPattern.exec(strData)) {

			// Get the delimiter that was found.
			let strMatchedDelimiter = arrMatches[1];

			// Check to see if the given delimiter has a length
			// (is not the start of string) and if it matches
			// field delimiter. If id does not, then we know
			// that this delimiter is a row delimiter.
			if (
				strMatchedDelimiter.length &&
				strMatchedDelimiter !== strDelimiter
			) {

				// Since we have reached a new row of data,
				// add an empty row to our data array.
				arrData.push([]);

			}

			let strMatchedValue;

			// Now that we have our delimiter out of the way,
			// let's check to see which kind of value we
			// captured (quoted or unquoted).
			if (arrMatches[2]) {

				// We found a quoted value. When we capture
				// this value, unescape any double quotes.
				strMatchedValue = arrMatches[2].replace(
					new RegExp("\"\"", "g"),
					"\""
				);

			} else {

				// We found a non-quoted value.
				strMatchedValue = arrMatches[3];

			}


			// Now that we have our value string, let's add
			// it to the data array.
			arrData[arrData.length - 1].push(strMatchedValue);
		}

		// Return the parsed data.
		return (arrData);
	}

	function podocIDalreadyPresentorNot(docNumber) {

		var purchaseorderSearchObj = search.create({
			type: "purchaseorder",
			filters:
				[
					["type", "anyof", "PurchOrd"],
					"AND",
					["numbertext", "is", docNumber]
				],
			columns:
				[
					search.createColumn({ name: "internalid", label: "Internal ID" })
				]
		});
		var po_id;

		var searchResultCount = purchaseorderSearchObj.runPaged().count;

		purchaseorderSearchObj.run().each(function (result) {
			po_id = result.id;
		});

		return po_id;
	}

	function vcdocIDalreadyPresentorNot(docNumber) {
		var vendorcreditSearchObj = search.create({
			type: "vendorcredit",
			filters:
				[
					["type", "anyof", "VendCred"],
					"AND",
					["numbertext", "is", docNumber]
				],
			columns:
				[
					search.createColumn({ name: "internalid", label: "Internal ID" })
				]
		});
		var vc_id;

		var searchResultCount = vendorcreditSearchObj.runPaged().count;

		vendorcreditSearchObj.run().each(function (result) {
			vc_id = result.id;
		});

		return vc_id;
	}
	function getVendorInternalIdFromName(vendorName) {
		var internalId = '';
		var customerSearchObj = search.create({
			type: "vendor",
			filters: [
				["entityid", "contains", vendorName]
			],
			columns: [
				search.createColumn({ name: "internalid", label: "Internal ID" })
			],
		});
		customerSearchObj.run().each(function (result) {
			internalId = result.getValue({ name: "internalid", label: "Internal ID" });
		});
		if (internalId != '') {
			return internalId;

		}
	}

	function get_all_Items_internal_id_(itemName) {

		log.audit({
			title: 'itemArr',
			details: JSON.stringify(itemName)
		})
		var dataArr = new Array();
		var itemIndexArr = new Array();
		var start = 0;
		var end = 1000;
		var item_length = itemName.length;
		var searchDataObj = new Object();
		var allItemsDataArr = new Object();
		var itemSearchObj = search.create({
			type: "item",
			filters: itemName,
			columns:
				[
					search.createColumn({
						name: "itemid",
						sort: search.Sort.ASC,
						label: "Name"
					}),
					search.createColumn({ name: "internalid", label: "internalid" })
				]
		});
		do {
			var searchResultCount = itemSearchObj.runPaged().count;
			// log.debug("itemSearchObj result count- new", searchResultCount);

			var result = itemSearchObj.run().getRange({ start: start, end: end });
			// log.debug("result new", result);
			for (var i = 0; i < result.length; i++) {
				var searchDataObj = {};

				var name = result[i].getValue({
					name: "itemid",
					sort: search.Sort.ASC,
					label: "Name"
				});

				var id = result[i].getValue({ name: "internalid", label: "internalid" });

				//log.debug("name", name);

				// searchDataObj[name] = id;

				allItemsDataArr[name] = id;
			}

			end += 1000;
			start += 1000;
			searchResultCount -= 1000;

		}
		while (searchResultCount > 0)

		//  log.debug("allItemsDataArr", allItemsDataArr);

		return allItemsDataArr;
	}

	function call_next_script(scriptName) {


		try {
			var mapTask = task.create({
				taskType: task.TaskType.MAP_REDUCE,
				scriptId: scriptName,
			});

			mapTask.submit();
			log.debug({
				title: "Yantra-Log",
				details: scriptName + ":- Map Reduce Script has been called",
			});
		}
		catch (errObj) {
			log.error({ title: 'Error while calling map reduce: errObj', details: errObj });
		}

	}

	return {
		_validateData: _validateData,
		_validateNumberStatus: _validateNumberStatus,
		moveErrorFiletoSFTP: moveErrorFiletoSFTP,
		getAllSearchResults: getAllSearchResults,
		createCSVFile: createCSVFile,
		unitsTypeSearch: unitsTypeSearch,
		deptSearch: deptSearch,
		classSearch: classSearch,
		locSearch: locSearch,
		itemTypeSearch: itemTypeSearch,
		costCatSearch: costCatSearch,
		subCatSearch: subCatSearch,
		sectionSearch: sectionSearch,
		item_is_existingornew: item_is_existingornew,
		getItemInternalId: getItemInternalId,
		getVendorInternalId: getVendorInternalId,
		createPOVRCSVErrorFile: createPOVRCSVErrorFile,
		poTypeListSearch: poTypeListSearch,
		formatDate: formatDate,
		getFilesFromSFTP: getFilesFromSFTP,
		moveToArchiveFolder: moveToArchiveFolder,
		check_salesrep: check_salesrep,
		containsNumber_and_valid_phn: containsNumber_and_valid_phn,
		getInternalId_source_transaction: getInternalId_source_transaction,
		getLocationId: getLocationId,
		doc_Type_Id: doc_Type_Id,
		paymentTerms: paymentTerms,
		doc_Type_Description: doc_Type_Description,
		GetCustomerInternalId: GetCustomerInternalId,
		createError: createError,
		sendEmail: sendEmail,
		CSVToArray: CSVToArray,
		podocIDalreadyPresentorNot: podocIDalreadyPresentorNot,
		vcdocIDalreadyPresentorNot: vcdocIDalreadyPresentorNot,
		getVendorInternalIdFromName: getVendorInternalIdFromName,
		GetCustomerInternalIdByExtenal_id: GetCustomerInternalIdByExtenal_id,
		getInternalId_source_transaction_credit: getInternalId_source_transaction_credit,
		get_all_Items_internal_id_: get_all_Items_internal_id_,
		call_next_script: call_next_script
	};
});
