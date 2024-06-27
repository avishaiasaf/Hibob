/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/portlet'], /**
 * @param{portlet} portlet
 */ (portlet) => {
      const EntryPoints = {};
      EntryPoints.pageInit = () => {
            portlet.resize();
      };
      EntryPoints.resize = () => {
            portlet.resize();
      };

      EntryPoints.fieldChanged = ({ fieldId }) => {
            try {
                  portlet.refresh();
                  portlet.resize();
            } catch (e) {
                  console.log('Error Occured', e);
            }
      };

      return EntryPoints;
});
